import { humanClick, humanType, pause } from "../human.js";
import type { PlatformAdapter, SignupResult, SyncResult } from "../types.js";
import { applyDiffs, emptySync, firstVisible, genericLogin, gotoChecked, readDiffs, type FieldMap } from "./base.js";

/**
 * Glassdoor: conta própria, mas a candidatura normalmente redireciona ao ATS ou ao Indeed.
 * Tratado principalmente como descoberta; login/perfil mínimos.
 */
const PROFILE_FIELDS: FieldMap = {
  firstName: ['input[name="firstName"]', 'input[id*="firstName" i]'],
  lastName: ['input[name="lastName"]', 'input[id*="lastName" i]'],
  headline: ['input[name*="title" i]', 'input[id*="headline" i]'],
  city: ['input[name*="location" i]', 'input[id*="location" i]'],
  about: ['textarea[name*="summary" i]', 'textarea[id*="about" i]'],
};

export const glassdoorAdapter: PlatformAdapter = {
  site: "glassdoor",
  urls: {
    login: "https://www.glassdoor.com/profile/login_input.htm",
    signup: "https://www.glassdoor.com/profile/join_input.htm",
    profile: "https://www.glassdoor.com/member/profile/index.htm",
  },

  async isLoggedIn({ page }) {
    if (/login_input|join_input|\/authentication\//.test(page.url())) return false;
    return (await page.locator('[data-test="user-menu"], [data-test="header-profile"], a[href*="/member/profile"]').count()) > 0;
  },

  async login(ctx) {
    const probe = async () => {
      await ctx.page.goto("https://www.glassdoor.com/member/home/index.htm", { waitUntil: "domcontentloaded" }).catch(() => undefined);
      await pause(1000, 2000);
      return glassdoorAdapter.isLoggedIn(ctx);
    };
    return genericLogin(ctx, {
      loginUrl: glassdoorAdapter.urls.login,
      email: ['input[name="username"]', "#inlineUserEmail", 'input[type="email"]', '[data-test="emailInput"]'],
      next: ['button[type="submit"]', '[data-test="email-form-button"]', 'button:has-text("Continue")'],
      password: ['input[name="password"]', "#inlineUserPassword", 'input[type="password"]'],
      submit: ['button[type="submit"]', 'button:has-text("Sign in")'],
      loggedInProbe: probe,
    });
  },

  async signup(ctx, profile): Promise<SignupResult> {
    const { page, rec } = ctx;
    const block = await gotoChecked(ctx, glassdoorAdapter.urls.signup, "navigate:signup");
    if (block && block !== "login_required") return { ok: false, waitingHuman: false, blocked: block };
    if (!ctx.creds) { await rec.waitingHuman(page, "signup", "defina CRED_GLASSDOOR_EMAIL/PASSWORD no .env"); return { ok: false, waitingHuman: true }; }

    const email = await firstVisible(page, ['input[type="email"]', 'input[name="username"]', '[data-test="emailInput"]']);
    if (!email) { await rec.blocked(page, "selector_missing", "signup:email"); return { ok: false, waitingHuman: false, blocked: "selector_missing" }; }
    await humanType(email, ctx.creds.email, { clear: true });
    const next = await firstVisible(page, ['button[type="submit"]', 'button:has-text("Continue")'], 1500);
    if (next && ctx.mode !== "DRY_RUN") { await humanClick(page, next); await pause(1500, 3000); }

    const pass = await firstVisible(page, ['input[type="password"]', 'input[name="password"]'], 4000);
    if (pass) await humanType(pass, ctx.creds.password, { clear: true });
    rec.mark("signup:filled", `e-mail${pass ? " e senha" : ""} preenchidos para ${profile.fullName}`);

    if (ctx.mode === "DRY_RUN") { rec.skip("signup:submit", "DRY_RUN"); return { ok: true, waitingHuman: false }; }
    const submit = await firstVisible(page, ['button[type="submit"]', 'button:has-text("Create account")', 'button:has-text("Sign up")'], 2000);
    if (submit) await humanClick(page, submit);
    await pause(2500, 4500);
    await rec.waitingHuman(page, "signup:verify", "Glassdoor costuma pedir confirmação por e-mail/captcha; complete na janela aberta");
    return { ok: true, waitingHuman: true };
  },

  async syncProfile(ctx, profile): Promise<SyncResult> {
    const block = await gotoChecked(ctx, glassdoorAdapter.urls.profile, "navigate:profile");
    if (block) return emptySync(block);
    if (!(await glassdoorAdapter.isLoggedIn(ctx))) { await ctx.rec.blocked(ctx.page, "login_required", "profile"); return emptySync("login_required"); }
    const edit = await firstVisible(ctx.page, ['button[aria-label*="Edit" i]', 'button:has-text("Edit")'], 2500);
    if (edit) { await humanClick(ctx.page, edit); await pause(1000, 2000); }
    const diffs = await readDiffs(ctx.page, PROFILE_FIELDS, profile);
    ctx.rec.mark("profile:read", `${diffs.filter((d) => d.changed).length} campo(s) divergente(s) de ${diffs.length}`);
    const { applied, skipped } = await applyDiffs(ctx, PROFILE_FIELDS, diffs);
    if (applied > 0) {
      const save = await firstVisible(ctx.page, ['button:has-text("Save")', 'button[type="submit"]'], 2000);
      if (save) { await humanClick(ctx.page, save); ctx.rec.mark("profile:save"); } else ctx.rec.skip("profile:save", "botão salvar não encontrado");
    }
    return { diffs, applied, skipped };
  },
};
