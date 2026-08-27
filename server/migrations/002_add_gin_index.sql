-- Add GIN index for lightning fast JSONB querying on the massive AST diff payloads
CREATE INDEX IF NOT EXISTS idx_diff_runs_payload 
ON diff_runs USING GIN (raw_diff_payload);
