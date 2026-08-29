package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/tm3l/tm3l-break-detector/internal/analyzer"
)

// PullRequestPayload represents the payload from GitHub or Forgejo pull request webhooks
type PullRequestPayload struct {
	Action      string `json:"action"`
	PullRequest struct {
		Number int `json:"number"`
		Head   struct {
			Sha  string `json:"sha"`
			Repo struct {
				FullName string `json:"full_name"`
			} `json:"repo"`
		} `json:"head"`
		Base struct {
			Sha string `json:"sha"`
		} `json:"base"`
		CommentsURL string `json:"comments_url"`
	} `json:"pull_request"`
}

func (s *Server) handleGitHubWebhook(w http.ResponseWriter, r *http.Request) {
	s.processPullRequestWebhook(w, r, "GitHub")
}

func (s *Server) handleForgejoWebhook(w http.ResponseWriter, r *http.Request) {
	s.processPullRequestWebhook(w, r, "Forgejo")
}

func (s *Server) processPullRequestWebhook(w http.ResponseWriter, r *http.Request, provider string) {
	var payload PullRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	// We only care about opened or synchronized events
	if payload.Action != "opened" && payload.Action != "synchronize" {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ignored"}`))
		return
	}

	slog.Info("Processing PR webhook", "provider", provider, "action", payload.Action, "pr_number", payload.PullRequest.Number)

	// Mock fetching the target file from the PR
	targetFileContent, err := mockFetchFile(payload.PullRequest.Head.Repo.FullName, payload.PullRequest.Head.Sha, "main.go")
	if err != nil {
		slog.Error("Failed to fetch target file", "err", err)
		http.Error(w, "failed to fetch file", http.StatusInternalServerError)
		return
	}

	// Run through the existing analyzer
	analysis := analyzer.AnalyzeCode(targetFileContent)

	// Format results
	results, err := json.MarshalIndent(analysis, "", "  ")
	if err != nil {
		slog.Error("Failed to marshal analysis", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	commentBody := fmt.Sprintf("## Break Detector Analysis (%s)\n\n```json\n%s\n```", provider, string(results))

	// Mock posting the comment back to the PR
	err = mockPostComment(payload.PullRequest.CommentsURL, commentBody)
	if err != nil {
		slog.Error("Failed to post PR comment", "err", err)
		http.Error(w, "failed to post comment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "processed"}`))
}

// mockFetchFile simulates fetching a file from the Git provider's API
func mockFetchFile(repo, sha, filename string) (string, error) {
	// In a real implementation, this would make an HTTP GET request to GitHub/Forgejo API
	// e.g. https://raw.githubusercontent.com/{repo}/{sha}/{filename}
	slog.Info("Mock fetching file", "repo", repo, "sha", sha, "filename", filename)
	return `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`, nil
}

// mockPostComment simulates posting a comment back to the Pull Request
func mockPostComment(commentsURL string, body string) error {
	// In a real implementation, this would make an HTTP POST request to the commentsURL
	slog.Info("Mock posting comment to PR", "url", commentsURL)
	
	payload := map[string]string{"body": body}
	jsonPayload, _ := json.Marshal(payload)
	
	// Create a dummy request to show how it would be done, though we just mock it.
	req, err := http.NewRequest("POST", commentsURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	// req.Header.Set("Authorization", "Bearer <token>")

	slog.Info("Successfully mocked posting comment", "body_preview", body[:min(len(body), 50)])
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
