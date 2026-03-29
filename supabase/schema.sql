-- TalentForge Schema
-- Run this in your Supabase SQL editor

-- Searches: one row per user query
create table if not exists searches (
  id         uuid primary key default gen_random_uuid(),
  query      text not null,
  status     text not null default 'pending' check (status in ('pending','running','completed','failed')),
  created_at timestamptz default now()
);

-- Candidates: each person found across platforms
create table if not exists candidates (
  id              uuid primary key default gen_random_uuid(),
  search_id       uuid references searches(id) on delete cascade,
  name            text not null,
  username        text not null,
  source          text not null check (source in ('github','linkedin','web')),
  profile_url     text not null,
  bio             text,
  location        text,
  score           int not null default 0,
  recent_activity boolean not null default false,
  created_at      timestamptz default now()
);

-- Skills: normalized skill tags per candidate
create table if not exists candidate_skills (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  skill        text not null
);

-- Projects: repos / portfolio items per candidate
create table if not exists candidate_projects (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  project_name text not null,
  description  text,
  stars        int not null default 0,
  url          text not null,
  language     text
);

-- Indexes
create index if not exists idx_candidates_search_id on candidates(search_id);
create index if not exists idx_candidates_score on candidates(score desc);
create index if not exists idx_skills_candidate_id on candidate_skills(candidate_id);
create index if not exists idx_projects_candidate_id on candidate_projects(candidate_id);
