-- Enable pgcrypto for gen_random_uuid() if not native (Postgres 13+ has it natively, but good practice)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE diff_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    commit_sha VARCHAR(40),
    status VARCHAR(20) NOT NULL, -- 'PASSED', 'FAILED', 'OVERRIDDEN'
    breaking_count INT DEFAULT 0,
    dangerous_count INT DEFAULT 0,
    raw_diff_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diff_run_id UUID REFERENCES diff_runs(id) ON DELETE CASCADE,
    overridden_by VARCHAR(255) NOT NULL,
    override_note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
