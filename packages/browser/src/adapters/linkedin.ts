import { humanClick, pause } from "../human.js";
import type { CanonicalProfile } from "../canonicalProfile.js";
import type { AdapterContext, PlatformAdapter, SignupResult, SyncResult } from "../types.js";
import { applyDiffs, emptySync, firstVisible, genericLogin, gotoChecked, readDiffs, type FieldMap } from "./base.js";

/**
 * LinkedIn: maior risco de automação. Padrão ASSISTED; signup sempre termina em WAITING_HUMAN
 * (verificação por e-mail/SMS + captcha são a regra). Profile sync edita só headline e "Sobre"
 * via modal de edição da intro.
 */
const INTRO_FIELDS: FieldMap = {
  headline: ['textarea[id*="headline" i]', 'input[id*="headline" i]', 'textarea[name*="headline" i]'],
  city: ['input[id*="city" i]', 'input[id*="location" i]'],
};
const ABOUT_FIELDS: FieldMap = {
  about: ['textarea[id*="summary" i]', 'textarea[id*="about" i]', 'div[role="textbox"]'],
};

async function probe(ctx: AdapterContext) {
  await ctx.page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await pause(1200, 2500);
  return linkedinAdapter.isLoggedIn(ctx);
}

export const linkedinAdapter: PlatformAdapter = {
  site: "linkedin",
  urls: {
    login: "https://www.linkedin.com/login",
    signup: "https://www.linkedin.com/signup",
    profile: "https://www.linkedin.com/in/me/",
  },

  async isLoggedIn({ page }) {
    const url = page.url();
    if (/\/login|\/authwall|\/checkpoint|\/uas\//.test(url)) return false;
    return (await page.locator('.global-nav__me, #global-nav, [data-control-name="identity_welcome_message"], .feed-identity-module').count()) > 0;
  },

  async login(ctx) {
    return genericLogin(ctx, {
      loginUrl: linkedinAdapter.urls.login,
      email: ["#username", 'input[name="session_key"]', 'input[autocomplete="username"]'],
      password: ["#password", 'input[name="session_password"]', 'input[type="password"]'],
      submit: ['button[type="submit"][data-litms-control-urn*="login"]', 'button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("Entrar")'],
      loggedInProbe: () => probe(ctx),
    });
  },

  async signup(ctx, _profile: CanonicalProfile): Promise<SignupResult> {
    const { page, rec } = ctx;
    const block = await gotoChecked(ctx, linkedinAdapter.urls.signup, "navigate:signup");
    if (block && block !== "login_required") return { ok: false, waitingHuman: false, blocked: block };
    // Política: no LinkedIn o cadastro é preenchido só até o envio; verificação é sempre humana.
    await rec.waitingHuman(page, "signup", "cadastro no LinkedIn exige verificação humana (e-mail/SMS/captcha). Complete na janela aberta; a sessão fica salva.");
    return { ok: false, waitingHuman: true };
  },

  async syncProfile(ctx, profile): Promise<SyncResult> {
    const { page, rec } = ctx;
    const block = await gotoChecked(ctx, linkedinAdapter.urls.profile, "navigate:profile");
    if (block) return emptySync(block);
    if (!(await linkedinAdapter.isLoggedIn(ctx))) { await rec.blocked(page, "login_required", "profile"); return emptySync("login_required"); }

    // Leitura do que está público na página (sem abrir modal).
    const headlineNow = await page.locator(".text-body-medium.break-words, [data-generated-suggestion-target] .text-body-medium").first().innerText().catch(() => "");
    const aboutNow = await page.locator("#about ~ .display-flex .inline-show-more-text, section:has(#about) .inline-show-more-text").first().innerText().catch(() => "");
    const diffs = [
      { field: "headline" as const, current: headlineNow.trim() || null, desired: profile.headline, changed: headlineNow.trim().toLowerCase() !== profile.headline.trim().toLowerCase() },
      { field: "about" as const, current: aboutNow.trim() || null, desired: profile.about, changed: aboutNow.replace(/\s+/g, " ").trim().toLowerCase() !== profile.about.replace(/\s+/g, " ").trim().toLowerCase() },
    ];
    rec.mark("profile:read", `${diffs.filter((d) => d.changed).length} campo(s) divergente(s)`);

    if (ctx.mode === "DRY_RUN") {
      for (const d of diffs) if (d.changed) rec.skip(`field:${d.field}`, `DRY_RUN: "${(d.current ?? "").slice(0, 40)}" → "${d.desired.slice(0, 40)}"`);
      return { diffs, applied: 0, skipped: diffs.filter((d) => d.changed).length };
    }

    let applied = 0, skipped = 0;

    if (diffs[0]!.changed) {
      const edit = await firstVisible(page, ['button[aria-label*="Edit intro" i]', 'button[aria-label*="Editar introdução" i]', 'a[href*="/edit/intro/"]'], 3000);
      if (edit) {
        await humanClick(page, edit);
        await pause(1200, 2200);
        const r = await applyDiffs(ctx, INTRO_FIELDS, await readDiffs(page, INTRO_FIELDS, profile));
        applied += r.applied; skipped += r.skipped;
        const save = await firstVisible(page, ['button[aria-label*="Save" i]', 'button:has-text("Save")', 'button:has-text("Salvar")'], 2000);
        if (save && r.applied) { await humanClick(page, save); rec.mark("profile:intro:save"); }
      } else { rec.skip("field:headline", "botão de editar introdução não encontrado"); skipped++; }
    }

    if (diffs[1]!.changed) {
      const edit = await firstVisible(page, ['section:has(#about) button[aria-label*="Edit" i]', 'a[href*="/edit/about/"]', 'section:has(#about) a[href*="edit"]'], 3000);
      if (edit) {
        await humanClick(page, edit);
        await pause(1200, 2200);
        const r = await applyDiffs(ctx, ABOUT_FIELDS, await readDiffs(page, ABOUT_FIELDS, profile));
        applied += r.applied; skipped += r.skipped;
        const save = await firstVisible(page, ['button[aria-label*="Save" i]', 'button:has-text("Save")', 'button:has-text("Salvar")'], 2000);
        if (save && r.applied) { await humanClick(page, save); rec.mark("profile:about:save"); }
      } else { rec.skip("field:about", "botão de editar 'Sobre' não encontrado"); skipped++; }
    }

    return { diffs, applied, skipped };
  },
};
