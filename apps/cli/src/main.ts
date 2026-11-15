#!/usr/bin/env tsx
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { enrichJob, type RawJob } from "@career/core";
import { makeRepos, openDb, type JobStatus } from "@career/db";
import { AnswerEngine, checkOllama, generateCoverLetter } from "@career/llm";
import { log } from "@career/logger";
import { SOURCES, type ApplyMode, type SiteId } from "@career/config";
import { loginAction, profileSyncAction, signupAction } from "@career/browser";
import { printJob, printTable } from "./format.js";

// Carrega .env da raiz sem dependência externa.
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile?.(".env");

const program = new Command();
program.name("career").description("CareerAI Agent: descobre, pontua e prepara candidaturas (local-first).").version("0.1.0");

const repos = () => makeRepos(openDb());

program
  .command("doctor")
  .description("Verifica banco, Ollama e modelos")
  .action(async () => {
    const r = repos();
    const s = r.stats();
    console.log(`DB ok: ${s.total} vagas, ${s.applied} candidaturas`);
    const o = await checkOllama();
    console.log(o.ok ? `Ollama ok: ${o.models.join(", ")}` : `Ollama: ${o.error}`);
    console.log(`Fontes configuradas: ${SOURCES.map((x) => `${x.id}(${x.applyMode})`).join(", ")}`);
  });

program
  .command("ingest <file>")
  .description("Importa vagas de um JSON (array de RawJob) e pontua. Nunca reprocessa a mesma vaga.")
  .option("--source <name>", "nome da fonte, se o JSON não trouxer")
  .action((file: string, opts: { source?: string }) => {
    const raw = JSON.parse(readFileSync(file, "utf8")) as RawJob[];
    const r = repos();
    let created = 0, dupes = 0, skipped = 0;
    const started = Date.now();
    for (const item of raw) {
      if (!item.title || !item.company || !item.url) { skipped++; continue; }
      const enriched = enrichJob({ ...item, source: item.source ?? opts.source });
      const res = r.upsertJob(enriched);
      if (res.created) created++; else dupes++;
      log.info({
        action: res.created ? "job.discovered" : "job.duplicate",
        company: enriched.companyMatch.name,
        role: enriched.title,
        country: enriched.companyMatch.international ? "INTL" : "BR",
        salary: enriched.salary.min ? `${enriched.salary.currency} ${enriched.salary.min}-${enriched.salary.max}` : undefined,
        score: enriched.score,
        language: enriched.language,
        persona: enriched.persona,
        decision: enriched.decision,
      });
    }
    r.logEvent("ingest", { file, created, dupes, skipped }, { durationMs: Date.now() - started });
    console.log(`novas: ${created} · duplicadas: ${dupes} · ignoradas: ${skipped}`);
  });

program
  .command("score")
  .description("Pontua uma vaga ad hoc sem salvar")
  .requiredOption("-t, --title <title>")
  .requiredOption("-c, --company <company>")
  .option("-u, --url <url>", "URL", "https://example.com/job")
  .option("-l, --location <location>")
  .option("-s, --salary <text>")
  .option("-d, --description <text>")
  .option("--json", "saída JSON")
  .action((o: { title: string; company: string; url: string; location?: string; salary?: string; description?: string; json?: boolean }) => {
    const e = enrichJob({ title: o.title, company: o.company, url: o.url, location: o.location, salaryText: o.salary, description: o.description });
    if (o.json) { console.log(JSON.stringify(e, null, 2)); return; }
    printJob(e);
  });

program
  .command("list")
  .description("Lista vagas por score")
  .option("--status <status>", "DISCOVERED | REVIEW | APPLIED | INTERVIEW | OFFER | REJECTED")
  .option("--min <score>", "score mínimo", (v) => Number(v))
  .option("--limit <n>", "limite", (v) => Number(v), 30)
  .action((o: { status?: JobStatus; min?: number; limit: number }) => {
    const rows = repos().listJobs({ status: o.status, minScore: o.min, limit: o.limit });
    printTable(rows.map((j) => ({ id: j.id, score: j.score, decision: j.decision, status: j.status, company: j.companyName, title: j.title.slice(0, 48), model: j.workModel, lang: j.language, persona: j.persona })));
  });

program
  .command("show <id>")
  .description("Detalhes de uma vaga")
  .action((id: string) => {
    const j = repos().getJob(Number(id));
    if (!j) { console.error("vaga não encontrada"); process.exitCode = 1; return; }
    console.log(JSON.stringify({ ...j, skills: JSON.parse(j.skillsJson), breakdown: JSON.parse(j.breakdownJson) }, null, 2));
  });

program
  .command("status <id> <status>")
  .description("Atualiza status manualmente (REVIEW → DISCOVERED para aprovar, etc.)")
  .action((id: string, status: JobStatus) => {
    repos().setJobStatus(Number(id), status);
    console.log("ok");
  });

program
  .command("cover-letter <id>")
  .description("Gera (ou lê do cache) a cover letter da vaga via Ollama")
  .option("--persona <id>")
  .option("--force", "ignora cache")
  .action(async (id: string, o: { persona?: string; force?: boolean }) => {
    const r = repos();
    const j = r.getJob(Number(id));
    if (!j) { console.error("vaga não encontrada"); process.exitCode = 1; return; }
    const res = await generateCoverLetter(r, j, { persona: o.persona as never, force: o.force });
    console.log(res.content);
    console.log(`\n--- ${res.cached ? "cache" : res.model} · guard: ${res.guard.ok ? "ok" : res.guard.issues.join("; ")} · doc #${res.id}`);
  });

program
  .command("answer <id> <question>")
  .description("Resolve uma pergunta de formulário para a vaga (perfil → banco → Ollama)")
  .option("--options <csv>", "opções separadas por vírgula")
  .option("--no-llm", "não usar Ollama")
  .action(async (id: string, question: string, o: { options?: string; llm: boolean }) => {
    const r = repos();
    const j = r.getJob(Number(id));
    if (!j) { console.error("vaga não encontrada"); process.exitCode = 1; return; }
    const engine = new AnswerEngine(r, { allowLlm: o.llm });
    const res = await engine.resolve(
      { label: question, options: o.options?.split(",").map((s) => s.trim()), type: o.options ? "select" : "textarea" },
      { jobId: j.id, title: j.title, company: j.companyName, description: j.description ?? undefined, language: j.language as never, persona: j.persona as never },
    );
    console.log(JSON.stringify(res, null, 2));
  });

program
  .command("approve-answer <question> <answer>")
  .description("Grava uma resposta humana aprovada no banco de respostas")
  .option("--lang <pt|en>", "idioma", "en")
  .action((question: string, answer: string, o: { lang: "pt" | "en" }) => {
    new AnswerEngine(repos()).approveHuman(question, answer, o.lang);
    console.log("ok");
  });

program
  .command("answers")
  .description("Lista o banco de respostas")
  .option("--status <s>", "needs_review | approved")
  .action((o: { status?: string }) => {
    printTable(repos().listAnswers(o.status).map((a) => ({ id: a.id, status: a.status, source: a.source, uses: a.useCount, q: a.questionNorm.slice(0, 50), a: a.answer.slice(0, 50) })));
  });

program
  .command("apply <id>")
  .description("Registra candidatura (manual/assistida) com todas as proteções de duplicidade")
  .option("--mode <mode>", "DRY_RUN | ASSISTED | AUTO", "ASSISTED")
  .option("--notes <text>")
  .action((id: string, o: { mode: string; notes?: string }) => {
    const r = repos();
    const j = r.getJob(Number(id));
    if (!j) { console.error("vaga não encontrada"); process.exitCode = 1; return; }
    const check = r.canApply(j);
    if (!check.ok) { console.error(`bloqueado: ${check.reason}`); process.exitCode = 1; return; }
    const app = r.recordApplication(j, { persona: j.persona, mode: o.mode, notes: o.notes });
    r.logEvent("application.recorded", { mode: o.mode }, { jobId: j.id });
    log.info({ action: "application.recorded", company: j.companyName, role: j.title, persona: j.persona, score: j.score });
    console.log(`candidatura #${app.id} registrada (${o.mode})`);
  });

// ---------- Navegador: login / signup / profile-sync ----------
const siteArg = (s: string): SiteId => {
  if (!["gupy", "linkedin", "indeed", "glassdoor"].includes(s)) throw new Error(`site inválido: ${s}`);
  return s as SiteId;
};
const modeOpt = (v: string): ApplyMode => {
  if (!["DRY_RUN", "ASSISTED", "AUTO"].includes(v)) throw new Error(`modo inválido: ${v}`);
  return v as ApplyMode;
};

program
  .command("login <site>")
  .description("Autentica na plataforma (gupy|linkedin|indeed|glassdoor) usando sessão persistente + CRED_* do .env")
  .option("--headless", "sem janela (não recomendado no primeiro login)")
  .option("--wait", "mantém a janela aberta se precisar de ação humana (OTP/captcha)")
  .action(async (site: string, o: { headless?: boolean; wait?: boolean }) => {
    const r = await loginAction(repos(), siteArg(site), { headless: o.headless, keepOpenOnHuman: o.wait ?? true });
    console.log(JSON.stringify(r));
    if (!r.ok) process.exitCode = 2;
  });

program
  .command("signup <site>")
  .description("Cadastro do zero. Preenche com o perfil canônico; para em OTP/captcha/confirmação de e-mail")
  .option("--mode <mode>", "DRY_RUN | ASSISTED (AUTO não se aplica a cadastro)", modeOpt, "DRY_RUN")
  .option("--persona <id>")
  .option("--lang <pt|en>")
  .option("--headless")
  .action(async (site: string, o: { mode: ApplyMode; persona?: string; lang?: "pt" | "en"; headless?: boolean }) => {
    const r = await signupAction(repos(), siteArg(site), { mode: o.mode === "AUTO" ? "ASSISTED" : o.mode, persona: o.persona as never, lang: o.lang, headless: o.headless, keepOpenOnHuman: true });
    console.log(JSON.stringify(r));
  });

program
  .command("profile-sync <site>")
  .description("Compara o perfil da plataforma com o canônico e corrige (DRY_RUN só mostra o diff)")
  .option("--mode <mode>", "DRY_RUN | ASSISTED | AUTO (limitado ao máximo do site em sources.ts)", modeOpt, "DRY_RUN")
  .option("--persona <id>")
  .option("--lang <pt|en>")
  .option("--headless")
  .action(async (site: string, o: { mode: ApplyMode; persona?: string; lang?: "pt" | "en"; headless?: boolean }) => {
    const r = await profileSyncAction(repos(), siteArg(site), { mode: o.mode, persona: o.persona as never, lang: o.lang, headless: o.headless, keepOpenOnHuman: true });
    if (r.blocked) { console.log(`bloqueado: ${r.blocked}`); process.exitCode = 2; return; }
    printTable(r.diffs.map((d) => ({ field: d.field, changed: d.changed ? "SIM" : "", current: (d.current ?? "").slice(0, 40), desired: d.desired.slice(0, 40) })));
    console.log(`aplicados: ${r.applied} · pulados: ${r.skipped}`);
  });

program
  .command("profile")
  .description("Mostra o perfil canônico que será sincronizado")
  .option("--persona <id>")
  .option("--lang <pt|en>", "idioma", "en")
  .action(async (o: { persona?: string; lang: "pt" | "en" }) => {
    const { buildCanonicalProfile } = await import("@career/browser");
    const p = buildCanonicalProfile({ persona: o.persona as never, lang: o.lang });
    console.log(JSON.stringify({ ...p, email: p.email ? "(definido)" : "(vazio: PROFILE_EMAIL)", phone: p.phone ? "(definido)" : "(vazio: PROFILE_PHONE)" }, null, 2));
  });

// ---------- Timeline ----------
program
  .command("runs")
  .description("Execuções recentes do navegador")
  .option("--site <site>")
  .option("--outcome <o>", "OK | BLOCKED | WAITING_HUMAN | FAILED | RUNNING")
  .option("--limit <n>", "limite", (v) => Number(v), 20)
  .action((o: { site?: string; outcome?: string; limit: number }) => {
    const rows = repos().listRuns({ site: o.site, outcome: o.outcome as never, limit: o.limit });
    printTable(rows.map((r) => ({ id: r.id, site: r.site, action: r.action, mode: r.mode, outcome: r.outcome, block: r.blockReason ?? "", started: r.startedAt.slice(0, 19), error: (r.error ?? "").slice(0, 40) })));
  });

program
  .command("timeline [runId]")
  .description("Sem id: resumo de bloqueios/erros por site. Com id: marcos da execução")
  .action((runId?: string) => {
    const r = repos();
    if (!runId) {
      const s = r.blockersSummary();
      printTable(Object.entries(s).map(([site, v]) => ({ site, total: v.total, ok: v.ok, blocked: v.blocked, waiting: v.waiting, failed: v.failed, lastBlock: v.lastBlock ?? "", lastError: v.lastError ?? "" })));
      return;
    }
    const { run, events } = r.getRunTimeline(Number(runId));
    if (!run) { console.error("run não encontrada"); process.exitCode = 1; return; }
    console.log(`#${run.id} ${run.site} ${run.action} [${run.mode}] → ${run.outcome}${run.blockReason ? ` (${run.blockReason})` : ""}`);
    printTable(events.map((e) => ({ ts: e.ts.slice(11, 19), status: e.status, step: e.step, detail: (e.detail ?? "").slice(0, 70), shot: e.screenshotPath ? "📷" : "" })));
  });

program
  .command("stats")
  .description("Métricas para o dashboard")
  .action(() => {
    console.log(JSON.stringify(repos().stats(), null, 2));
  });

program.parseAsync(process.argv).catch((err) => {
  log.error({ action: "cli.fatal", error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
