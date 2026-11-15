import { and, desc, eq, gte, sql } from "drizzle-orm";
import { applicationHash, normalizeCompany, normalizeUrl, type EnrichedJob } from "@career/core";
import type { Db } from "./client.js";
import { answers, applications, companies, events, generatedDocs, jobSources, jobs, runEvents, runs, type Job } from "./schema.js";

export type RunOutcome = "RUNNING" | "OK" | "BLOCKED" | "WAITING_HUMAN" | "FAILED";
export type BlockReason = "captcha" | "otp" | "checkpoint" | "login_required" | "rate_limit" | "selector_missing" | "unknown";
export type RunEventStatus = "ok" | "blocked" | "error" | "waiting_human" | "skipped";

export type JobStatus = "DISCOVERED" | "REVIEW" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";

export interface UpsertResult {
  job: Job;
  created: boolean;
  /** true quando a mesma vaga já existia vinda de outra URL/fonte. */
  duplicateOfExisting: boolean;
}

export function makeRepos(db: Db) {
  function upsertCompany(name: string, info: { industry?: string | undefined; international: boolean; listed: boolean }) {
    const nameNorm = normalizeCompany(name);
    const existing = db.select().from(companies).where(eq(companies.nameNorm, nameNorm)).get();
    if (existing) return existing;
    return db
      .insert(companies)
      .values({ name, nameNorm, industry: info.industry ?? null, international: info.international, priority: info.listed })
      .returning()
      .get();
  }

  /**
   * Insere a vaga se for nova. Dedupe por URL normalizada e por job_hash.
   * Nunca processa a mesma vaga duas vezes: se já existe, só registra a fonte.
   */
  function upsertJob(e: EnrichedJob): UpsertResult {
    const url = normalizeUrl(e.url);
    const byUrl = db.select().from(jobs).where(eq(jobs.url, url)).get();
    if (byUrl) return { job: byUrl, created: false, duplicateOfExisting: false };

    const byHash = db.select().from(jobs).where(eq(jobs.jobHash, e.jobHash)).get();
    if (byHash) {
      db.insert(jobSources).values({ jobId: byHash.id, site: e.source ?? "unknown", sourceUrl: url }).onConflictDoNothing().run();
      return { job: byHash, created: false, duplicateOfExisting: true };
    }

    const company = upsertCompany(e.companyMatch.name, {
      industry: e.industry,
      international: e.companyMatch.international,
      listed: e.companyMatch.listed,
    });

    const initialStatus: JobStatus =
      e.decision === "REJECT" ? "REJECTED" : e.decision === "MANUAL_REVIEW" ? "REVIEW" : "DISCOVERED";

    const job = db
      .insert(jobs)
      .values({
        jobHash: e.jobHash,
        companyId: company.id,
        companyName: e.companyMatch.name,
        title: e.title,
        location: e.location ?? null,
        url,
        description: e.description ?? null,
        language: e.language,
        seniority: e.seniority,
        salaryMin: e.salary.min,
        salaryMax: e.salary.max,
        currency: e.salary.currency,
        salaryPeriod: e.salary.period,
        workModel: e.workModel,
        industry: e.industry,
        roleCluster: e.roleCluster,
        skillsJson: JSON.stringify(e.skillsMatched),
        score: e.score,
        breakdownJson: JSON.stringify(e.breakdown),
        decision: e.decision,
        persona: e.persona,
        status: initialStatus,
        source: e.source ?? null,
        postedAt: e.postedAt ?? null,
      })
      .returning()
      .get();

    db.insert(jobSources).values({ jobId: job.id, site: e.source ?? "unknown", sourceUrl: url }).onConflictDoNothing().run();
    return { job, created: true, duplicateOfExisting: false };
  }

  function listJobs(opts: { status?: JobStatus | undefined; minScore?: number | undefined; limit?: number | undefined } = {}) {
    const conds = [];
    if (opts.status) conds.push(eq(jobs.status, opts.status));
    if (opts.minScore !== undefined) conds.push(gte(jobs.score, opts.minScore));
    const q = db.select().from(jobs).orderBy(desc(jobs.score), desc(jobs.discoveredAt)).limit(opts.limit ?? 50);
    return conds.length ? q.where(and(...conds)).all() : q.all();
  }

  function getJob(id: number) {
    return db.select().from(jobs).where(eq(jobs.id, id)).get() ?? null;
  }

  function setJobStatus(id: number, status: JobStatus) {
    db.update(jobs).set({ status, updatedAt: new Date().toISOString() }).where(eq(jobs.id, id)).run();
  }

  /** Verifica todas as proteções de duplicidade antes de aplicar (CLAUDE.md). */
  function canApply(job: Job): { ok: boolean; reason?: string } {
    const hash = applicationHash(job.companyName, job.title, job.location ?? undefined, job.url);
    const byHash = db.select().from(applications).where(eq(applications.applicationHash, hash)).get();
    if (byHash) return { ok: false, reason: "application_hash já existe" };
    const byJob = db.select().from(applications).where(eq(applications.jobId, job.id)).get();
    if (byJob) return { ok: false, reason: "já existe candidatura para esta vaga" };
    if (job.status === "APPLIED" || job.status === "INTERVIEW" || job.status === "OFFER") {
      return { ok: false, reason: `status atual ${job.status}` };
    }
    return { ok: true };
  }

  function recordApplication(job: Job, opts: { persona: string; mode: string; coverLetterId?: number | undefined; notes?: string | undefined }) {
    const check = canApply(job);
    if (!check.ok) throw new Error(`Duplicidade: ${check.reason}`);
    const hash = applicationHash(job.companyName, job.title, job.location ?? undefined, job.url);
    const app = db
      .insert(applications)
      .values({ applicationHash: hash, jobId: job.id, persona: opts.persona, mode: opts.mode, coverLetterId: opts.coverLetterId ?? null, notes: opts.notes ?? null })
      .returning()
      .get();
    setJobStatus(job.id, "APPLIED");
    return app;
  }

  // ---- Banco de respostas ----
  function findAnswer(questionHash: string) {
    return db.select().from(answers).where(eq(answers.questionHash, questionHash)).get() ?? null;
  }
  function saveAnswer(v: { questionNorm: string; questionHash: string; answer: string; language: string; source: string; status: string }) {
    return db
      .insert(answers)
      .values(v)
      .onConflictDoUpdate({ target: answers.questionHash, set: { answer: v.answer, source: v.source, status: v.status } })
      .returning()
      .get();
  }
  function touchAnswer(id: number) {
    db.update(answers).set({ useCount: sql`${answers.useCount} + 1`, lastUsedAt: new Date().toISOString() }).where(eq(answers.id, id)).run();
  }
  function listAnswers(status?: string) {
    const q = db.select().from(answers).orderBy(desc(answers.useCount));
    return status ? q.where(eq(answers.status, status)).all() : q.all();
  }
  function approveAnswer(id: number) {
    db.update(answers).set({ status: "approved" }).where(eq(answers.id, id)).run();
  }

  // ---- Cache de IA ----
  function findGenerated(inputHash: string) {
    return db.select().from(generatedDocs).where(eq(generatedDocs.inputHash, inputHash)).get() ?? null;
  }
  function saveGenerated(v: { jobId: number | null; kind: string; language: string; persona: string; model: string; inputHash: string; content: string }) {
    return db.insert(generatedDocs).values(v).onConflictDoNothing().returning().get() ?? findGenerated(v.inputHash)!;
  }
  function approveGenerated(id: number) {
    db.update(generatedDocs).set({ status: "approved" }).where(eq(generatedDocs.id, id)).run();
  }

  // ---- Eventos ----
  function logEvent(action: string, payload: Record<string, unknown> = {}, opts: { jobId?: number | undefined; durationMs?: number | undefined; error?: string | undefined } = {}) {
    db.insert(events).values({ action, jobId: opts.jobId ?? null, payloadJson: JSON.stringify(payload), durationMs: opts.durationMs ?? null, error: opts.error ?? null }).run();
  }

  // ---- Timeline de execuções ----
  function startRun(v: { site: string; action: string; mode: string; jobId?: number | undefined }) {
    return db.insert(runs).values({ site: v.site, action: v.action, mode: v.mode, jobId: v.jobId ?? null }).returning().get();
  }
  function addRunEvent(runId: number, v: { step: string; status: RunEventStatus; detail?: string | undefined; screenshotPath?: string | undefined; url?: string | undefined }) {
    return db.insert(runEvents).values({ runId, step: v.step, status: v.status, detail: v.detail ?? null, screenshotPath: v.screenshotPath ?? null, url: v.url ?? null }).returning().get();
  }
  function finishRun(runId: number, v: { outcome: RunOutcome; blockReason?: BlockReason | undefined; error?: string | undefined; summary?: Record<string, unknown> | undefined }) {
    db.update(runs)
      .set({ outcome: v.outcome, blockReason: v.blockReason ?? null, error: v.error ?? null, summaryJson: JSON.stringify(v.summary ?? {}), finishedAt: new Date().toISOString() })
      .where(eq(runs.id, runId))
      .run();
  }
  function listRuns(opts: { site?: string | undefined; outcome?: RunOutcome | undefined; limit?: number | undefined } = {}) {
    const conds = [];
    if (opts.site) conds.push(eq(runs.site, opts.site));
    if (opts.outcome) conds.push(eq(runs.outcome, opts.outcome));
    const q = db.select().from(runs).orderBy(desc(runs.startedAt)).limit(opts.limit ?? 20);
    return conds.length ? q.where(and(...conds)).all() : q.all();
  }
  function getRunTimeline(runId: number) {
    const run = db.select().from(runs).where(eq(runs.id, runId)).get() ?? null;
    const evs = db.select().from(runEvents).where(eq(runEvents.runId, runId)).orderBy(runEvents.ts, runEvents.id).all();
    return { run, events: evs };
  }
  /** Só o que interessa: bloqueios e erros recentes, agrupados por site. */
  function blockersSummary(limit = 50) {
    const recent = db.select().from(runs).orderBy(desc(runs.startedAt)).limit(limit).all();
    const bySite: Record<string, { total: number; ok: number; blocked: number; failed: number; waiting: number; lastBlock?: string | undefined; lastError?: string | undefined }> = {};
    for (const r of recent) {
      const s = (bySite[r.site] ??= { total: 0, ok: 0, blocked: 0, failed: 0, waiting: 0 });
      s.total++;
      if (r.outcome === "OK") s.ok++;
      if (r.outcome === "BLOCKED") { s.blocked++; s.lastBlock ??= `${r.blockReason ?? "?"} @ ${r.startedAt}`; }
      if (r.outcome === "FAILED") { s.failed++; s.lastError ??= `${(r.error ?? "?").slice(0, 80)} @ ${r.startedAt}`; }
      if (r.outcome === "WAITING_HUMAN") s.waiting++;
    }
    return bySite;
  }

  // ---- Métricas (dashboard) ----
  function stats() {
    const byStatus = db.select({ status: jobs.status, n: sql<number>`count(*)` }).from(jobs).groupBy(jobs.status).all();
    const byDecision = db.select({ decision: jobs.decision, n: sql<number>`count(*)` }).from(jobs).groupBy(jobs.decision).all();
    const topIndustries = db.select({ industry: jobs.industry, n: sql<number>`count(*)` }).from(jobs).groupBy(jobs.industry).orderBy(desc(sql`count(*)`)).limit(10).all();
    const topCompanies = db.select({ company: jobs.companyName, n: sql<number>`count(*)` }).from(jobs).groupBy(jobs.companyName).orderBy(desc(sql`count(*)`)).limit(10).all();
    const total = db.select({ n: sql<number>`count(*)` }).from(jobs).get()?.n ?? 0;
    const applied = db.select({ n: sql<number>`count(*)` }).from(applications).get()?.n ?? 0;
    return { total, applied, byStatus, byDecision, topIndustries, topCompanies };
  }

  return {
    upsertCompany,
    upsertJob,
    listJobs,
    getJob,
    setJobStatus,
    canApply,
    recordApplication,
    findAnswer,
    saveAnswer,
    touchAnswer,
    listAnswers,
    approveAnswer,
    findGenerated,
    saveGenerated,
    approveGenerated,
    logEvent,
    stats,
    startRun,
    addRunEvent,
    finishRun,
    listRuns,
    getRunTimeline,
    blockersSummary,
  };
}

export type Repos = ReturnType<typeof makeRepos>;
