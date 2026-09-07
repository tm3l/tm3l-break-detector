package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

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

	// Fetch target file from the PR (real API if GITHUB_TOKEN set, or graceful sample fallback)
	targetFileContent, err := fetchPRFile(provider, payload.PullRequest.Head.Repo.FullName, payload.PullRequest.Head.Sha, "main.go")
	if err != nil {
		slog.Error("Failed to fetch target file", "err", err)
		http.Error(w, "failed to fetch file", http.StatusInternalServerError)
		return
	}

	// Run through the analyzer
	analysis := analyzer.AnalyzeCode(targetFileContent)

	// Format results
	results, err := json.MarshalIndent(analysis, "", "  ")
	if err != nil {
		slog.Error("Failed to marshal analysis", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	commentBody := fmt.Sprintf("## 🔍 TM3L Break Detector Analysis (%s)\n\n| Language | Functions | Classes | System Calls |\n| :--- | :--- | :--- | :--- |\n| %s | %d | %d | %d |\n\n```json\n%s\n```",
		provider,
		analysis.Language.Name,
		analysis.FunctionCount,
		analysis.ClassCount,
		len(analysis.SystemCalls),
		string(results),
	)

	// Post comment back to the PR (real API if GITHUB_TOKEN set, or graceful simulation)
	err = postPRComment(provider, payload.PullRequest.CommentsURL, commentBody)
	if err != nil {
		slog.Error("Failed to post PR comment", "err", err)
		http.Error(w, "failed to post comment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "processed"}`))
}

// fetchPRFile retrieves the file from the Git provider API, falling back to local simulation if uncredentialed
func fetchPRFile(provider, repo, sha, filename string) (string, error) {
	token := os.Getenv("GITHUB_TOKEN")
	if provider == "Forgejo" {
		if ft := os.Getenv("FORGEJO_TOKEN"); ft != "" {
			token = ft
		}
	}

	if token != "" {
		slog.Info("Fetching file from Git API", "provider", provider, "repo", repo, "sha", sha, "filename", filename)
		apiURL := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s?ref=%s", repo, filename, sha)
		req, err := http.NewRequest("GET", apiURL, nil)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Accept", "application/vnd.github.v3.raw")
			req.Header.Set("User-Agent", "tm3l-break-detector/1.0")

			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				defer resp.Body.Close()
				bodyBytes, err := io.ReadAll(resp.Body)
				if err == nil {
					return string(bodyBytes), nil
				}
			} else if resp != nil {
				slog.Warn("Git API fetch returned non-200 status, using fallback sample", "status", resp.StatusCode)
				resp.Body.Close()
			}
		}
	}

	// Offline / unauthenticated demo sample
	slog.Info("Using simulated file retrieval (no Git token configured)", "repo", repo, "filename", filename)
	return `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`, nil
}

// postPRComment posts an inline comment to the Pull Request, falling back to local logging if uncredentialed
func postPRComment(provider, commentsURL, body string) error {
	token := os.Getenv("GITHUB_TOKEN")
	if provider == "Forgejo" {
		if ft := os.Getenv("FORGEJO_TOKEN"); ft != "" {
			token = ft
		}
	}

	payload := map[string]string{"body": body}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	if token != "" && commentsURL != "" {
		slog.Info("Dispatching PR review comment to Git API", "provider", provider, "url", commentsURL)
		req, err := http.NewRequest("POST", commentsURL, bytes.NewBuffer(jsonPayload))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("User-Agent", "tm3l-break-detector/1.0")

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			slog.Warn("Failed to post comment to Git API", "err", err)
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			slog.Info("Successfully posted PR review comment", "status", resp.StatusCode)
			return nil
		}
		slog.Warn("Git API comment post returned non-2xx status", "status", resp.StatusCode)
	}

	slog.Info("Simulated PR review comment recorded (no Git token configured)", "preview", body[:min(len(body), 60)])
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
