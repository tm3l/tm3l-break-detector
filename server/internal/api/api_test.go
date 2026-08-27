package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/tm3l/tm3l-break-detector/internal/db"
	"github.com/tm3l/tm3l-break-detector/internal/models"
)

func TestAPIContracts(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://tm3l_user:tm3l_password@localhost:5432/tm3l_break_detector?sslmode=disable"
	}

	store, err := db.NewPostgresStore(dsn)
	if err != nil {
		t.Fatalf("Failed to connect to db: %v", err)
	}

	broker := NewBroker()
	server := NewServer(store, broker)

	clientChan := make(chan []byte, 10)
	broker.mu.Lock()
	if broker.clients["default"] == nil {
		broker.clients["default"] = make(map[chan []byte]bool)
	}
	broker.clients["default"][clientChan] = true
	broker.mu.Unlock()

	// Test 1: Create Project
	reqBody := []byte(`{"name":"test-api-proj-3"}`)
	req, _ := http.NewRequest("POST", "/api/projects", bytes.NewBuffer(reqBody))
	rr := httptest.NewRecorder()

	server.Router.ServeHTTP(rr, req)

	var p models.Project
	json.NewDecoder(rr.Body).Decode(&p)

	// Setup Mock Diff Run directly in DB for Test 2 (we skip testing the multipart file upload directly to save test boilerplate)
	run := &models.DiffRun{
		ProjectID:      p.ID,
		Status:         "FAILED",
		RawDiffPayload: json.RawMessage(`{}`),
	}
	store.InsertDiffRun(run)

	// Test Login
	loginBody := []byte(`{"password":"admin"}`)
	req, _ = http.NewRequest("POST", "/api/login", bytes.NewBuffer(loginBody))
	rr = httptest.NewRecorder()
	server.Router.ServeHTTP(rr, req)

	var cookies = rr.Result().Cookies()
	var jwtCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "tm3l_jwt" {
			jwtCookie = c
			break
		}
	}
	if jwtCookie == nil {
		t.Fatalf("Expected tm3l_jwt cookie to be set")
	}

	// Test 2: Override Diff Run
	overrideBody := []byte(`{"note":"Safe break"}`)
	req, _ = http.NewRequest("POST", "/api/diffs/"+run.ID+"/override", bytes.NewBuffer(overrideBody))
	req.AddCookie(jwtCookie)
	rr = httptest.NewRecorder()

	server.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d. Body: %s", rr.Code, rr.Body.String())
	}
	t.Logf("Override successful via HTTP")

	// Verify SSE
	for i := 0; i < 2; i++ {
		select {
		case <-clientChan:
		case <-time.After(1 * time.Second):
			t.Fatalf("Failed to broadcast SSE event")
		}
	}
}
