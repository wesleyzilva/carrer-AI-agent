import { SOURCES, type ApplyMode, type PersonaId, type SiteId } from "@career/config";
import type { Repos } from "@career/db";
import { buildCanonicalProfile } from "./canonicalProfile.js";
import { getCredentials, maskEmail } from "./credentials.js";
import { getAdapter } from "./adapters/index.js";
import { Recorder } from "./recorder.js";
import { openSession } from "./session.js";
import type { AdapterContext } from "./types.js";

export interface ActionOptions {
  mode?: ApplyMode | undefined;
  headless?: boolean | undefined;
  persona?: PersonaId | undefined;
  lang?: "pt" | "en" | undefined;
  /** Mantém a janela aberta ao final para o humano resolver bloqueios. */
  keepOpenOnHuman?: boolean | undefined;
}

/** Modo efetivo: nunca acima do máximo configurado para o site em sources.ts. */
export function effectiveMode(site: SiteId, requested?: ApplyMode): ApplyMode {
  const order: ApplyMode[] = ["DRY_RUN", "ASSISTED", "AUTO"];
  const max = SOURCES.filter((s) => s.site === site).map((s) => order.indexOf(s.applyMode)).reduce((a, b) => Math.max(a, b), 0);
  const req = order.indexOf(requested ?? "DRY_RUN");
  return order[Math.min(req, max)]!;
}

async function withSession<T>(
  repos: Repos,
  site: SiteId,
  action: string,
  opts: ActionOptions,
  fn: (ctx: AdapterContext) => Promise<{ result: T; outcome: "OK" | "BLOCKED" | "WAITING_HUMAN" | "FAILED"; blockReason?: string | undefined; summary?: Record<string, unknown> | undefined }>,
): Promise<T> {
  const mode = effectiveMode(site, opts.mode);
  const rec = new Recorder(repos, site, action, mode);
  const creds = getCredentials(site);
  rec.mark("credentials", creds ? `env: ${maskEmail(creds.email)}` : "sem credenciais no .env");

  const browser = await openSession(site, { headless: opts.headless });
  const page = browser.pages()[0] ?? (await browser.newPage());
  const ctx: AdapterContext = { page, rec, mode, creds };

  try {
    const { result, outcome, blockReason, summary } = await fn(ctx);
    rec.finish(outcome, { blockReason: blockReason as never, summary });
    const needsHuman = outcome === "WAITING_HUMAN" || outcome === "BLOCKED";
    if (needsHuman && opts.keepOpenOnHuman && !opts.headless) {
      console.log("\n>> Janela mantida aberta. Resolva o bloqueio e feche o navegador para encerrar.\n");
      await new Promise<void>((resolve) => browser.on("close", () => resolve()));
    }
    return result;
  } catch (err) {
    await rec.error(page, action, err);
    rec.finish("FAILED", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export function loginAction(repos: Repos, site: SiteId, opts: ActionOptions = {}) {
  return withSession(repos, site, "login", opts, async (ctx) => {
    const r = await getAdapter(site).login(ctx);
    return {
      result: r,
      outcome: r.ok ? "OK" : r.blocked === "login_required" || r.blocked === "otp" || r.blocked === "captcha" || r.blocked === "checkpoint" ? "WAITING_HUMAN" : r.blocked ? "BLOCKED" : "FAILED",
      blockReason: r.blocked,
      summary: { alreadyLoggedIn: r.alreadyLoggedIn },
    };
  });
}

export function signupAction(repos: Repos, site: SiteId, opts: ActionOptions = {}) {
  const profile = buildCanonicalProfile({ persona: opts.persona, lang: opts.lang ?? (site === "gupy" ? "pt" : "en") });
  return withSession(repos, site, "signup", opts, async (ctx) => {
    const r = await getAdapter(site).signup(ctx, profile);
    return {
      result: r,
      outcome: r.waitingHuman ? "WAITING_HUMAN" : r.ok ? "OK" : r.blocked ? "BLOCKED" : "FAILED",
      blockReason: r.blocked,
    };
  });
}

export function profileSyncAction(repos: Repos, site: SiteId, opts: ActionOptions = {}) {
  const profile = buildCanonicalProfile({ persona: opts.persona, lang: opts.lang ?? (site === "gupy" ? "pt" : "en") });
  return withSession(repos, site, "profile_sync", opts, async (ctx) => {
    const adapter = getAdapter(site);
    const login = await adapter.login(ctx);
    if (!login.ok) {
      return { result: { diffs: [], applied: 0, skipped: 0, blocked: login.blocked }, outcome: login.blocked ? "WAITING_HUMAN" : "FAILED", blockReason: login.blocked };
    }
    const r = await adapter.syncProfile(ctx, profile);
    const changed = r.diffs.filter((d) => d.changed).length;
    return {
      result: r,
      outcome: r.blocked ? "BLOCKED" : "OK",
      blockReason: r.blocked,
      summary: { fields: r.diffs.length, changed, applied: r.applied, skipped: r.skipped, mode: ctx.mode },
    };
  });
}
