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
	ListDiffRuns(projectID string, limit int) ([]*models.DiffRun, error)
	GetDiffRun(id string) (*models.DiffRun, error)
	GetAuditOverride(diffRunID string) (*models.AuditOverride, error)
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

func (s *PostgresStore) ListDiffRuns(projectID string, limit int) ([]*models.DiffRun, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows *sql.Rows
	var err error
	if projectID != "" {
		query := `
			SELECT id, project_id, commit_sha, status, breaking_count, dangerous_count, raw_diff_payload, created_at
			FROM diff_runs
			WHERE project_id = $1
			ORDER BY created_at DESC
			LIMIT $2
		`
		rows, err = s.db.Query(query, projectID, limit)
	} else {
		query := `
			SELECT id, project_id, commit_sha, status, breaking_count, dangerous_count, raw_diff_payload, created_at
			FROM diff_runs
			ORDER BY created_at DESC
			LIMIT $1
		`
		rows, err = s.db.Query(query, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runs []*models.DiffRun
	for rows.Next() {
		r := &models.DiffRun{}
		if err := rows.Scan(&r.ID, &r.ProjectID, &r.CommitSHA, &r.Status, &r.BreakingCount, &r.DangerousCount, &r.RawDiffPayload, &r.CreatedAt); err != nil {
			return nil, err
		}
		runs = append(runs, r)
	}
	return runs, nil
}

func (s *PostgresStore) GetDiffRun(id string) (*models.DiffRun, error) {
	query := `
		SELECT id, project_id, commit_sha, status, breaking_count, dangerous_count, raw_diff_payload, created_at
		FROM diff_runs
		WHERE id = $1
	`
	r := &models.DiffRun{}
	err := s.db.QueryRow(query, id).Scan(&r.ID, &r.ProjectID, &r.CommitSHA, &r.Status, &r.BreakingCount, &r.DangerousCount, &r.RawDiffPayload, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (s *PostgresStore) GetAuditOverride(diffRunID string) (*models.AuditOverride, error) {
	query := `
		SELECT id, diff_run_id, overridden_by, override_note, created_at
		FROM audit_overrides
		WHERE diff_run_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	o := &models.AuditOverride{}
	err := s.db.QueryRow(query, diffRunID).Scan(&o.ID, &o.DiffRunID, &o.OverriddenBy, &o.OverrideNote, &o.CreatedAt)
	if err != nil {
		return nil, err
	}
	return o, nil
}

