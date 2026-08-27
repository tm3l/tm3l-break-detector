package db

import (
	"database/sql"

	_ "github.com/lib/pq"
	"github.com/tm3l/tm3l-break-detector/internal/models"
)

// Store interface defines our database contracts
type Store interface {
	CreateProject(name string) (*models.Project, error)
	InsertDiffRun(run *models.DiffRun) error
	OverrideDiffRun(override *models.AuditOverride) error
}

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(dsn string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) CreateProject(name string) (*models.Project, error) {
	query := `INSERT INTO projects (name) VALUES ($1) RETURNING id, name, created_at`
	p := &models.Project{}
	err := s.db.QueryRow(query, name).Scan(&p.ID, &p.Name, &p.CreatedAt)
	return p, err
}

func (s *PostgresStore) InsertDiffRun(run *models.DiffRun) error {
	query := `
		INSERT INTO diff_runs (project_id, commit_sha, status, breaking_count, dangerous_count, raw_diff_payload)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	err := s.db.QueryRow(
		query,
		run.ProjectID, run.CommitSHA, run.Status, run.BreakingCount, run.DangerousCount, run.RawDiffPayload,
	).Scan(&run.ID, &run.CreatedAt)
	return err
}

func (s *PostgresStore) OverrideDiffRun(override *models.AuditOverride) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert the audit record
	insertQuery := `
		INSERT INTO audit_overrides (diff_run_id, overridden_by, override_note)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	err = tx.QueryRow(insertQuery, override.DiffRunID, override.OverriddenBy, override.OverrideNote).
		Scan(&override.ID, &override.CreatedAt)
	if err != nil {
		return err
	}

	// 2. Update the status of the diff run
	updateQuery := `UPDATE diff_runs SET status = 'OVERRIDDEN' WHERE id = $1`
	_, err = tx.Exec(updateQuery, override.DiffRunID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
