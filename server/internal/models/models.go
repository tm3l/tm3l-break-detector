package models

import (
	"encoding/json"
	"time"
)

// Project represents an API being tracked.
type Project struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// DiffRun represents a single execution of the Rust AST diff engine.
type DiffRun struct {
	ID             string          `json:"id" db:"id"`
	ProjectID      string          `json:"project_id" db:"project_id"`
	CommitSHA      *string         `json:"commit_sha,omitempty" db:"commit_sha"`
	Status         string          `json:"status" db:"status"` // PASSED, FAILED, OVERRIDDEN
	BreakingCount  int             `json:"breaking_count" db:"breaking_count"`
	DangerousCount int             `json:"dangerous_count" db:"dangerous_count"`
	RawDiffPayload json.RawMessage `json:"raw_diff_payload" db:"raw_diff_payload"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
}

// AuditOverride represents a human overriding a FAILED diff run.
type AuditOverride struct {
	ID           string    `json:"id" db:"id"`
	DiffRunID    string    `json:"diff_run_id" db:"diff_run_id"`
	OverriddenBy string    `json:"overridden_by" db:"overridden_by"`
	OverrideNote string    `json:"override_note" db:"override_note"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// IPCResponse represents the exact JSON structure the Rust engine outputs.
type IPCResponse struct {
	Summary struct {
		Breaking  int `json:"breaking"`
		Dangerous int `json:"dangerous"`
		Additive  int `json:"additive"`
	} `json:"summary"`
	Changes []struct {
		Severity    string `json:"severity"`
		Path        string `json:"path"`
		Description string `json:"description"`
		Citation    string `json:"citation"`
		ProposedFix string `json:"proposed_fix"`
	} `json:"changes"`
}
