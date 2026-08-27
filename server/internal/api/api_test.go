package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
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
		t.Skipf("Skipping integration test: database not reachable (%v)", err)
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
	projectName := fmt.Sprintf("test-api-proj-%d", time.Now().UnixNano())
	reqBody, _ := json.Marshal(map[string]string{"name": projectName})
	req, _ := http.NewRequest("POST", "/api/projects", bytes.NewBuffer(reqBody))
	rr := httptest.NewRecorder()

	server.Router.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("Failed to create project (status %d): %s", rr.Code, rr.Body.String())
	}

	var p models.Project
	if err := json.NewDecoder(rr.Body).Decode(&p); err != nil {
		t.Fatalf("Failed to decode project: %v", err)
	}

	// Setup Mock Diff Run directly in DB for Test 2 (we skip testing the multipart file upload directly to save test boilerplate)
	sha := "abcdef123456"
	run := &models.DiffRun{
		ProjectID:      p.ID,
		CommitSHA:      &sha,
		Status:         "FAILED",
		BreakingCount:  1,
		RawDiffPayload: json.RawMessage(`{"summary": {"breaking": 1}}`),
	}
	if err := store.InsertDiffRun(run); err != nil {
		t.Fatalf("Failed to insert diff run: %v", err)
	}

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

func TestPromptEndpoint(t *testing.T) {
	broker := NewBroker()
	server := &Server{
		broker: broker,
		Router: chi.NewRouter(),
	}
	server.routes()

	reqBody, _ := json.Marshal(map[string]interface{}{
		"source_code": "import urllib2\nprint 'hello'",
		"targets": map[string]bool{
			"docker": true,
			"cli":    true,
		},
	})
	req, _ := http.NewRequest("POST", "/api/prompt", bytes.NewBuffer(reqBody))
	rr := httptest.NewRecorder()
	server.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var resp struct {
		Markdown string `json:"markdown"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	if resp.Markdown == "" {
		t.Fatalf("Expected non-empty markdown prompt")
	}
}

func TestCodeDiffEndpoint(t *testing.T) {
	broker := NewBroker()
	server := &Server{
		broker: broker,
		Router: chi.NewRouter(),
	}
	server.routes()

	tests := []struct {
		name     string
		lang     string
		code     string
		expected string
	}{
		{
			name:     "Python migration",
			lang:     "python",
			code:     "print 'Hello World'",
			expected: "queued",
		},
		{
			name:     "Go migration",
			lang:     "go",
			code:     "package main\nimport \"io/ioutil\"",
			expected: "queued",
		},
		{
			name:     "TypeScript migration",
			lang:     "typescript",
			code:     "var x = 1;",
			expected: "queued",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody, _ := json.Marshal(map[string]interface{}{
				"source_code": tt.code,
				"mode":        "code_migration",
				"language":    tt.lang,
			})
			req, _ := http.NewRequest("POST", "/api/code-diff", bytes.NewBuffer(reqBody))
			rr := httptest.NewRecorder()
			server.Router.ServeHTTP(rr, req)

			if rr.Code != http.StatusAccepted {
				t.Fatalf("Expected 202 Accepted, got %d. Body: %s", rr.Code, rr.Body.String())
			}

			var resp map[string]string
			if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
				t.Fatalf("Failed to decode response: %v", err)
			}
			if resp["status"] != tt.expected {
				t.Fatalf("Expected status %s, got %s", tt.expected, resp["status"])
			}
			if resp["language"] != tt.lang {
				t.Fatalf("Expected language %s, got %s", tt.lang, resp["language"])
			}
		})
	}
}

func TestListAndGetDiffEndpoints(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://tm3l_user:tm3l_password@localhost:5432/tm3l_break_detector?sslmode=disable"
	}

	store, err := db.NewPostgresStore(dsn)
	if err != nil {
		t.Skipf("Skipping integration test: database not reachable (%v)", err)
	}

	broker := NewBroker()
	server := NewServer(store, broker)

	// 1. Test GET /api/diffs
	req, _ := http.NewRequest("GET", "/api/diffs", nil)
	rr := httptest.NewRecorder()
	server.Router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK from GET /api/diffs, got %d", rr.Code)
	}

	var runs []*models.DiffRun
	if err := json.NewDecoder(rr.Body).Decode(&runs); err != nil {
		t.Fatalf("Failed to decode diff runs list: %v", err)
	}

	if len(runs) > 0 {
		// 2. Test GET /api/diffs/{id}
		firstID := runs[0].ID
		getReq, _ := http.NewRequest("GET", "/api/diffs/"+firstID, nil)
		getRR := httptest.NewRecorder()
		server.Router.ServeHTTP(getRR, getReq)

		if getRR.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK from GET /api/diffs/%s, got %d", firstID, getRR.Code)
		}
	}
}


