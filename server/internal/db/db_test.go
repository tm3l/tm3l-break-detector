package db

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/tm3l/tm3l-break-detector/internal/models"
)

func TestDatabaseContracts(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://tm3l_user:tm3l_password@localhost:5432/tm3l_break_detector?sslmode=disable"
	}

	store, err := NewPostgresStore(dsn)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	// 1. Create a Project
	p, err := store.CreateProject("core-payments-api")
	if err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}
	t.Logf("Created Project ID: %s", p.ID)

	// 2. Insert a Mock Diff Run (representing Rust Output)
	mockPayload := []byte(`{"summary": {"breaking": 1}, "changes": [{"severity": "BREAKING", "path": "test"}]}`)
	sha := "abcdef123456"
	run := &models.DiffRun{
		ProjectID:      p.ID,
		CommitSHA:      &sha,
		Status:         "FAILED", // Failed due to breaking changes
		BreakingCount:  1,
		DangerousCount: 0,
		RawDiffPayload: json.RawMessage(mockPayload),
	}

	err = store.InsertDiffRun(run)
	if err != nil {
		t.Fatalf("Failed to insert diff run: %v", err)
	}
	t.Logf("Inserted FAILED Diff Run ID: %s", run.ID)

	// 3. Human Override
	override := &models.AuditOverride{
		DiffRunID:    run.ID,
		OverriddenBy: "lead-engineer@tm3l.com",
		OverrideNote: "Approved per PDR-001. Endpoint was sunset 6 months ago.",
	}

	err = store.OverrideDiffRun(override)
	if err != nil {
		t.Fatalf("Failed to apply override: %v", err)
	}
	t.Logf("Successfully applied override. Audit Log ID: %s", override.ID)

	// Clean up (optional, since it's a dev DB)
	store.db.Exec("DELETE FROM projects WHERE id = $1", p.ID)
}
