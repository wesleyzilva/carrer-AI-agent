import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => new Date().toISOString();

export const companies = sqliteTable(
  "companies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    nameNorm: text("name_norm").notNull(),
    industry: text("industry"),
    country: text("country"),
    international: integer("international", { mode: "boolean" }).notNull().default(false),
    priority: integer("priority", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("companies_name_norm_idx").on(t.nameNorm)],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobHash: text("job_hash").notNull(),
    companyId: integer("company_id").references(() => companies.id),
    companyName: text("company_name").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    url: text("url").notNull(),
    description: text("description"),
    language: text("language").notNull().default("unknown"),
    seniority: text("seniority").notNull().default("unknown"),
    salaryMin: real("salary_min"),
    salaryMax: real("salary_max"),
    currency: text("currency").notNull().default("unknown"),
    salaryPeriod: text("salary_period").notNull().default("unknown"),
    workModel: text("work_model").notNull().default("unknown"),
    industry: text("industry").notNull().default("other"),
    roleCluster: text("role_cluster"),
    skillsJson: text("skills_json").notNull().default("[]"),
    score: integer("score").notNull().default(0),
    breakdownJson: text("breakdown_json").notNull().default("{}"),
    decision: text("decision").notNull().default("REJECT"),
    persona: text("persona").notNull().default("agentic_tpm"),
    status: text("status").notNull().default("DISCOVERED"),
    source: text("source"),
    postedAt: text("posted_at"),
    discoveredAt: text("discovered_at").notNull().$defaultFn(now),
    updatedAt: text("updated_at").notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("jobs_job_hash_idx").on(t.jobHash),
    uniqueIndex("jobs_url_idx").on(t.url),
    index("jobs_status_idx").on(t.status),
    index("jobs_decision_idx").on(t.decision),
    index("jobs_score_idx").on(t.score),
  ],
);

export const jobSources = sqliteTable(
  "job_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: integer("job_id").notNull().references(() => jobs.id),
    site: text("site").notNull(),
    sourceUrl: text("source_url").notNull(),
    seenAt: text("seen_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("job_sources_url_idx").on(t.sourceUrl)],
);

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationHash: text("application_hash").notNull(),
    jobId: integer("job_id").notNull().references(() => jobs.id),
    persona: text("persona").notNull(),
    mode: text("mode").notNull().default("ASSISTED"),
    resumeVersion: text("resume_version"),
    coverLetterId: integer("cover_letter_id"),
    status: text("status").notNull().default("APPLIED"),
    appliedAt: text("applied_at").notNull().$defaultFn(now),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("applications_hash_idx").on(t.applicationHash), index("applications_job_idx").on(t.jobId)],
);

export const interviews = sqliteTable("interviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  stage: text("stage").notNull(),
  scheduledAt: text("scheduled_at"),
  notes: text("notes"),
  outcome: text("outcome"),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

/** Banco de respostas reutilizáveis para formulários (rules-first). */
export const answers = sqliteTable(
  "answers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    questionNorm: text("question_norm").notNull(),
    questionHash: text("question_hash").notNull(),
    answer: text("answer").notNull(),
    language: text("language").notNull().default("unknown"),
    source: text("source").notNull().default("profile"), // profile | bank | llm | human
    status: text("status").notNull().default("needs_review"), // needs_review | approved
    useCount: integer("use_count").notNull().default(0),
    lastUsedAt: text("last_used_at"),
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("answers_hash_idx").on(t.questionHash)],
);

/** Cache de artefatos gerados por IA. Mesma entrada → mesmo documento. */
export const generatedDocs = sqliteTable(
  "generated_docs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: integer("job_id").references(() => jobs.id),
    kind: text("kind").notNull(), // cover_letter | resume_summary | answer | interview_prep
    language: text("language").notNull(),
    persona: text("persona").notNull(),
    model: text("model").notNull(),
    inputHash: text("input_hash").notNull(),
    content: text("content").notNull(),
    status: text("status").notNull().default("needs_review"),
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("generated_docs_input_hash_idx").on(t.inputHash), index("generated_docs_job_idx").on(t.jobId)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ts: text("ts").notNull().$defaultFn(now),
    action: text("action").notNull(),
    jobId: integer("job_id"),
    payloadJson: text("payload_json").notNull().default("{}"),
    durationMs: integer("duration_ms"),
    error: text("error"),
  },
  (t) => [index("events_action_idx").on(t.action), index("events_ts_idx").on(t.ts)],
);

/**
 * Execuções do navegador (login, signup, profile-sync, apply). Uma linha por run.
 * Serve para a timeline: saber rapidamente se houve bloqueio ou erro.
 */
export const runs = sqliteTable(
  "runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    site: text("site").notNull(),
    action: text("action").notNull(), // login | signup | profile_sync | apply | discover
    mode: text("mode").notNull().default("DRY_RUN"),
    jobId: integer("job_id"),
    startedAt: text("started_at").notNull().$defaultFn(now),
    finishedAt: text("finished_at"),
    outcome: text("outcome").notNull().default("RUNNING"), // RUNNING | OK | BLOCKED | WAITING_HUMAN | FAILED
    blockReason: text("block_reason"), // captcha | otp | checkpoint | login_required | rate_limit | selector_missing
    error: text("error"),
    summaryJson: text("summary_json").notNull().default("{}"),
  },
  (t) => [index("runs_site_idx").on(t.site), index("runs_outcome_idx").on(t.outcome), index("runs_started_idx").on(t.startedAt)],
);

/** Só marcos, bloqueios e erros — não é log de tudo. */
export const runEvents = sqliteTable(
  "run_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runId: integer("run_id").notNull().references(() => runs.id),
    ts: text("ts").notNull().$defaultFn(now),
    step: text("step").notNull(), // ex.: navigate, login, otp, field:headline
    status: text("status").notNull(), // ok | blocked | error | waiting_human | skipped
    detail: text("detail"),
    screenshotPath: text("screenshot_path"),
    url: text("url"),
  },
  (t) => [index("run_events_run_idx").on(t.runId)],
);

export type Run = typeof runs.$inferSelect;
export type RunEvent = typeof runEvents.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type GeneratedDoc = typeof generatedDocs.$inferSelect;
