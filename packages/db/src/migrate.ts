import type Database from "better-sqlite3";

/**
 * Schema idempotente em SQL puro (CREATE IF NOT EXISTS), para o projeto rodar sem
 * passo de migração separado. Para evoluções, use `pnpm db:generate` (drizzle-kit)
 * e adicione os ALTERs aqui ou troque para o migrator do Drizzle.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_norm TEXT NOT NULL,
  industry TEXT,
  country TEXT,
  international INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS companies_name_norm_idx ON companies(name_norm);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_hash TEXT NOT NULL,
  company_id INTEGER REFERENCES companies(id),
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  url TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'unknown',
  seniority TEXT NOT NULL DEFAULT 'unknown',
  salary_min REAL,
  salary_max REAL,
  currency TEXT NOT NULL DEFAULT 'unknown',
  salary_period TEXT NOT NULL DEFAULT 'unknown',
  work_model TEXT NOT NULL DEFAULT 'unknown',
  industry TEXT NOT NULL DEFAULT 'other',
  role_cluster TEXT,
  skills_json TEXT NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  breakdown_json TEXT NOT NULL DEFAULT '{}',
  decision TEXT NOT NULL DEFAULT 'REJECT',
  persona TEXT NOT NULL DEFAULT 'agentic_tpm',
  status TEXT NOT NULL DEFAULT 'DISCOVERED',
  source TEXT,
  posted_at TEXT,
  discovered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_job_hash_idx ON jobs(job_hash);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_url_idx ON jobs(url);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_decision_idx ON jobs(decision);
CREATE INDEX IF NOT EXISTS jobs_score_idx ON jobs(score);

CREATE TABLE IF NOT EXISTS job_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  site TEXT NOT NULL,
  source_url TEXT NOT NULL,
  seen_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS job_sources_url_idx ON job_sources(source_url);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_hash TEXT NOT NULL,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  persona TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'ASSISTED',
  resume_version TEXT,
  cover_letter_id INTEGER,
  status TEXT NOT NULL DEFAULT 'APPLIED',
  applied_at TEXT NOT NULL,
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS applications_hash_idx ON applications(application_hash);
CREATE INDEX IF NOT EXISTS applications_job_idx ON applications(job_id);

CREATE TABLE IF NOT EXISTS interviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  stage TEXT NOT NULL,
  scheduled_at TEXT,
  notes TEXT,
  outcome TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_norm TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  answer TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'unknown',
  source TEXT NOT NULL DEFAULT 'profile',
  status TEXT NOT NULL DEFAULT 'needs_review',
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS answers_hash_idx ON answers(question_hash);

CREATE TABLE IF NOT EXISTS generated_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES jobs(id),
  kind TEXT NOT NULL,
  language TEXT NOT NULL,
  persona TEXT NOT NULL,
  model TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS generated_docs_input_hash_idx ON generated_docs(input_hash);
CREATE INDEX IF NOT EXISTS generated_docs_job_idx ON generated_docs(job_id);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  action TEXT NOT NULL,
  job_id INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}',
  duration_ms INTEGER,
  error TEXT
);
CREATE INDEX IF NOT EXISTS events_action_idx ON events(action);
CREATE INDEX IF NOT EXISTS events_ts_idx ON events(ts);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site TEXT NOT NULL,
  action TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'DRY_RUN',
  job_id INTEGER,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  outcome TEXT NOT NULL DEFAULT 'RUNNING',
  block_reason TEXT,
  error TEXT,
  summary_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS runs_site_idx ON runs(site);
CREATE INDEX IF NOT EXISTS runs_outcome_idx ON runs(outcome);
CREATE INDEX IF NOT EXISTS runs_started_idx ON runs(started_at);

CREATE TABLE IF NOT EXISTS run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES runs(id),
  ts TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  screenshot_path TEXT,
  url TEXT
);
CREATE INDEX IF NOT EXISTS run_events_run_idx ON run_events(run_id);
`;

export function ensureSchema(sqlite: Database.Database) {
  sqlite.exec(SCHEMA_SQL);
}

// Execução direta: `pnpm db:migrate`
if (process.argv[1] && /migrate\.(ts|js)$/.test(process.argv[1])) {
  const { openDb, resolveDbPath } = await import("./client.js");
  openDb();
  console.log(`schema ok → ${resolveDbPath()}`);
}
