package api

import (
	"fmt"
	"net/http"
	"sync"
)

type BrokerEvent struct {
	ProjectID string
	Payload   []byte
}

type Broker struct {
	mu sync.Mutex
	// map[projectID]map[clientChan]bool
	clients  map[string]map[chan []byte]bool
	Notifier chan BrokerEvent
}

func NewBroker() *Broker {
	b := &Broker{
		clients:  make(map[string]map[chan []byte]bool),
		Notifier: make(chan BrokerEvent, 100),
	}
	go b.listen()
	return b
}

func (b *Broker) listen() {
	for {
		select {
		case s := <-b.Notifier:
			b.mu.Lock()
			if projectClients, ok := b.clients[s.ProjectID]; ok {
				for clientMessageChan := range projectClients {
					select {
					case clientMessageChan <- s.Payload:
					default:
					}
				}
			}
			b.mu.Unlock()
		}
	}
}

func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	projectID := r.URL.Query().Get("project_id")
	if projectID == "" {
		projectID = "default"
	}

	messageChan := make(chan []byte)
	b.mu.Lock()
	if b.clients[projectID] == nil {
		b.clients[projectID] = make(map[chan []byte]bool)
	}
	b.clients[projectID][messageChan] = true
	b.mu.Unlock()

	defer func() {
		b.mu.Lock()
		delete(b.clients[projectID], messageChan)
		if len(b.clients[projectID]) == 0 {
			delete(b.clients, projectID)
		}
		b.mu.Unlock()
		close(messageChan)
	}()

	for {
		select {
		case <-r.Context().Done():
			return
		case msg := <-messageChan:
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		}
	}
}
