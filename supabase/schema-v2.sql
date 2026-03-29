-- TalentForge Schema v2 Migration
-- Run this in your Supabase SQL editor AFTER schema.sql

-- 1. Score breakdown column on candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS score_breakdown jsonb;

-- 2. Talent pools
CREATE TABLE IF NOT EXISTS talent_pools (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

-- 3. Junction: candidates in pools
CREATE TABLE IF NOT EXISTS talent_pool_candidates (
  pool_id      uuid REFERENCES talent_pools(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  added_at     timestamptz DEFAULT now(),
  PRIMARY KEY (pool_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_pool_candidates_pool_id      ON talent_pool_candidates(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_candidates_candidate_id ON talent_pool_candidates(candidate_id);
