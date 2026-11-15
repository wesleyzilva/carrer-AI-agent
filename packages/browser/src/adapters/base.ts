import type { Locator, Page } from "playwright";
import type { BlockReason } from "@career/db";
import { detectBlock } from "../blocks.js";
import { humanClick, humanGoto, humanType, pause } from "../human.js";
import { sameValue, type CanonicalProfile } from "../canonicalProfile.js";
import type { AdapterContext, LoginResult, ProfileFieldDiff, SyncResult } from "../types.js";

/** Primeiro seletor que existir e estiver visível. */
export async function firstVisible(page: Page, selectors: string[], timeoutMs = 4000): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      try {
        if ((await loc.count()) > 0 && (await loc.isVisible())) return loc;
      } catch {
        /* continua */
      }
    }
    await pause(150, 350);
  }
  return null;
}

/** Vai para a URL e checa bloqueio. Retorna o motivo se bloqueado. */
export async function gotoChecked(ctx: AdapterContext, url: string, step: string): Promise<BlockReason | null> {
  await humanGoto(ctx.page, url);
  const block = await detectBlock(ctx.page);
  if (block && block !== "login_required") {
    await ctx.rec.blocked(ctx.page, block, step);
    return block;
  }
  ctx.rec.mark(step, undefined, ctx.page.url());
  return block;
}

/**
 * Login genérico e-mail/senha. Cada adaptador passa seus seletores.
 * Para em captcha/otp/checkpoint e devolve o motivo.
 */
export async function genericLogin(
  ctx: AdapterContext,
  cfg: { loginUrl: string; email: string[]; password: string[]; submit: string[]; next?: string[] | undefined; loggedInProbe: () => Promise<boolean> },
): Promise<LoginResult> {
  const { page, rec, creds } = ctx;
  if (await cfg.loggedInProbe()) {
    rec.mark("login", "sessão persistente já autenticada");
    return { ok: true, alreadyLoggedIn: true };
  }
  if (!creds) {
    await rec.waitingHuman(page, "login", "sem credenciais no .env; faça login manualmente na janela aberta");
    return { ok: false, alreadyLoggedIn: false, blocked: "login_required" };
  }

  const block = await gotoChecked(ctx, cfg.loginUrl, "navigate:login");
  if (block && block !== "login_required") return { ok: false, alreadyLoggedIn: false, blocked: block };

  const emailField = await firstVisible(page, cfg.email);
  if (!emailField) {
    await rec.blocked(page, "selector_missing", "login:email", "campo de e-mail não encontrado; seletores precisam de atualização");
    return { ok: false, alreadyLoggedIn: false, blocked: "selector_missing" };
  }
  await humanType(emailField, creds.email, { clear: true });

  // Fluxos em duas etapas (e-mail → próximo → senha)
  if (cfg.next) {
    const next = await firstVisible(page, cfg.next, 1500);
    if (next) await humanClick(page, next);
  }

  const passField = await firstVisible(page, cfg.password, 6000);
  if (!passField) {
    const b = await detectBlock(page);
    if (b && b !== "login_required") { await rec.blocked(page, b, "login:password"); return { ok: false, alreadyLoggedIn: false, blocked: b }; }
    await rec.blocked(page, "selector_missing", "login:password", "campo de senha não encontrado");
    return { ok: false, alreadyLoggedIn: false, blocked: "selector_missing" };
  }
  await humanType(passField, creds.password, { clear: true });

  const submit = await firstVisible(page, cfg.submit, 2000);
  if (submit) await humanClick(page, submit); else await passField.press("Enter");
  await pause(2500, 5000);

  const after = await detectBlock(page);
  if (after && after !== "login_required") {
    await rec.blocked(page, after, "login:after-submit");
    await rec.waitingHuman(page, "login", `resolva ${after} na janela e rode novamente; a sessão fica salva`);
    return { ok: false, alreadyLoggedIn: false, blocked: after };
  }
  if (await cfg.loggedInProbe()) {
    rec.mark("login", "autenticado", page.url());
    return { ok: true, alreadyLoggedIn: false };
  }
  await rec.error(page, "login", new Error("login não confirmado (credenciais inválidas ou layout mudou)"));
  return { ok: false, alreadyLoggedIn: false };
}

/** Mapa de campo canônico → seletores possíveis em uma página de perfil/cadastro. */
export type FieldMap = Partial<Record<keyof CanonicalProfile, string[]>>;

/** Lê valores atuais dos campos (inputs/textareas ou texto visível) e calcula o diff. */
export async function readDiffs(page: Page, map: FieldMap, profile: CanonicalProfile): Promise<ProfileFieldDiff[]> {
  const diffs: ProfileFieldDiff[] = [];
  for (const [field, selectors] of Object.entries(map) as Array<[keyof CanonicalProfile, string[]]>) {
    const desired = profile[field];
    if (!desired) continue;
    const loc = await firstVisible(page, selectors, 1500);
    let current: string | null = null;
    if (loc) {
      try {
        const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
        current = tag === "input" || tag === "textarea" || tag === "select" ? await loc.inputValue() : (await loc.innerText()).trim();
      } catch {
        current = null;
      }
    }
    diffs.push({ field, current, desired, changed: !sameValue(current, desired) });
  }
  return diffs;
}

/** Aplica diffs em inputs/textareas. Só escreve; quem salva é o adaptador. */
export async function applyDiffs(ctx: AdapterContext, map: FieldMap, diffs: ProfileFieldDiff[]): Promise<{ applied: number; skipped: number }> {
  let applied = 0, skipped = 0;
  for (const d of diffs) {
    if (!d.changed) continue;
    if (ctx.mode === "DRY_RUN") { ctx.rec.skip(`field:${d.field}`, `DRY_RUN: "${(d.current ?? "").slice(0, 40)}" → "${d.desired.slice(0, 40)}"`); skipped++; continue; }
    const loc = await firstVisible(ctx.page, map[d.field] ?? [], 1500);
    if (!loc) { ctx.rec.skip(`field:${d.field}`, "seletor não encontrado"); skipped++; continue; }
    try {
      const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === "select") await loc.selectOption({ label: d.desired });
      else await humanType(loc, d.desired, { clear: true });
      ctx.rec.mark(`field:${d.field}`, `"${(d.current ?? "").slice(0, 40)}" → "${d.desired.slice(0, 40)}"`);
      applied++;
    } catch (err) {
      await ctx.rec.error(ctx.page, `field:${d.field}`, err);
      skipped++;
    }
  }
  return { applied, skipped };
}

export function emptySync(blocked?: BlockReason): SyncResult {
  return { diffs: [], applied: 0, skipped: 0, blocked };
}
