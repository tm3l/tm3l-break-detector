package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/tm3l/tm3l-break-detector/internal/analyzer"
	"github.com/tm3l/tm3l-break-detector/internal/db"
	"github.com/tm3l/tm3l-break-detector/internal/models"
)

type Server struct {
	store  db.Store
	broker *Broker
	Router *chi.Mux
}

func NewServer(store db.Store, broker *Broker) *Server {
	s := &Server{
		store:  store,
		broker: broker,
		Router: chi.NewRouter(),
	}
	StartWorkerPool(store, broker, 5)
	s.routes()
	return s
}

func (s *Server) routes() {
	s.Router.Get("/api/events", s.broker.ServeHTTP)
	s.Router.Post("/api/projects", s.handleCreateProject)

	s.Router.Post("/api/login", s.handleLogin)

	s.Router.With(RequireAPIKey).Post("/api/diffs", s.handleRunDiff)
	s.Router.With(RequireJWT).Post("/api/diffs/{id}/override", s.handleOverrideDiff)
	s.Router.Post("/api/prompt", s.handleGeneratePrompt)
	s.Router.Post("/api/code-diff", s.handleCodeDiff)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Password != "admin" {
		http.Error(w, "invalid password", http.StatusUnauthorized)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "admin",
		"exp": time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(JWTSecret)
	if err != nil {
		http.Error(w, "failed to sign token", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "tm3l_jwt",
		Value:    tokenString,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteStrictMode,
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "logged_in"})
}

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	p, err := s.store.CreateProject(req.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	event, _ := json.Marshal(map[string]interface{}{"type": "project_created", "data": p})
	s.broker.Notifier <- event

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

func (s *Server) handleRunDiff(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	projectID := r.FormValue("project_id")
	commitSHA := r.FormValue("commit_sha")

	if projectID == "" {
		http.Error(w, "project_id is required", http.StatusBadRequest)
		return
	}

	baseFile, _, err := r.FormFile("base_spec")
	if err != nil {
		http.Error(w, "base_spec file is required", http.StatusBadRequest)
		return
	}
	defer baseFile.Close()

	targetFile, _, err := r.FormFile("target_spec")
	if err != nil {
		http.Error(w, "target_spec file is required", http.StatusBadRequest)
		return
	}
	defer targetFile.Close()

	tmpBase, _ := os.CreateTemp("", "base-*.json")
	tmpTarget, _ := os.CreateTemp("", "target-*.json")
	io.Copy(tmpBase, baseFile)
	io.Copy(tmpTarget, targetFile)
	tmpBase.Close()
	tmpTarget.Close()

	JobQueue <- DiffJob{
		ProjectID:  projectID,
		CommitSHA:  commitSHA,
		BaseFile:   tmpBase.Name(),
		TargetFile: tmpTarget.Name(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "queued"})
}

func (s *Server) handleOverrideDiff(w http.ResponseWriter, r *http.Request) {
	diffID := chi.URLParam(r, "id")
	var req struct {
		Note string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userID := "anonymous"
	if claimsID, ok := r.Context().Value("user_id").(string); ok {
		userID = claimsID
	}

	override := &models.AuditOverride{
		DiffRunID:    diffID,
		OverriddenBy: userID,
		OverrideNote: req.Note,
	}

	if err := s.store.OverrideDiffRun(override); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	event, _ := json.Marshal(map[string]interface{}{"type": "diff_overridden", "diff_id": diffID})
	s.broker.Notifier <- event

	// Dispatch Webhook to close the CI/CD loop (async)
	go http.Post("http://localhost:8080/mock-webhook", "application/json", bytes.NewBuffer(event))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "override_id": override.ID, "overridden_by": userID})
}

func (s *Server) handleGeneratePrompt(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SourceCode string          `json:"source_code"`
		Targets    map[string]bool `json:"targets"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.SourceCode == "" {
		http.Error(w, "source_code is required", http.StatusBadRequest)
		return
	}
	if req.Targets == nil {
		req.Targets = map[string]bool{}
	}

	// Run deep static analysis
	analysis := analyzer.AnalyzeCode(req.SourceCode)

	// Synthesize deterministic LLM prompt
	markdown := analyzer.SynthesizePrompt(analysis, req.Targets, req.SourceCode)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"markdown": markdown,
		"analysis": analysis,
	})
}

func (s *Server) handleCodeDiff(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SourceCode string `json:"source_code"`
		Mode       string `json:"mode"` // "python_migration" | future modes
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.SourceCode == "" {
		http.Error(w, "source_code is required", http.StatusBadRequest)
		return
	}
	if req.Mode == "" {
		req.Mode = "python_migration"
	}

	// Write code to a temp file so the Rust engine can consume it
	tmpFile, err := os.CreateTemp("", "code-*.py")
	if err != nil {
		http.Error(w, "Failed to create temp file", http.StatusInternalServerError)
		return
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.WriteString(req.SourceCode)
	tmpFile.Close()

	// Queue a special Python-migration diff job
	JobQueue <- DiffJob{
		ProjectID:  "code-diff",
		CommitSHA:  "manual-code-diff",
		BaseFile:   tmpFile.Name(), // unused in python_migration mode
		TargetFile: tmpFile.Name(),
		Mode:       req.Mode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "queued", "mode": req.Mode})
}
