import { humanClick, humanType, pause } from "../human.js";
import type { CanonicalProfile } from "../canonicalProfile.js";
import type { AdapterContext, PlatformAdapter, SignupResult, SyncResult } from "../types.js";
import { applyDiffs, emptySync, firstVisible, genericLogin, gotoChecked, readDiffs, type FieldMap } from "./base.js";
import { detectBlock } from "../blocks.js";

/**
 * Gupy: conta única do candidato (login.gupy.io) reutilizada em todos os portais *.gupy.io.
 * Seletores são best-effort; validar na primeira execução em DRY_RUN.
 */
const PROFILE_FIELDS: FieldMap = {
  fullName: ['input[name="name"]', 'input[id*="name" i]', 'input[placeholder*="nome completo" i]'],
  phone: ['input[name="phone"]', 'input[type="tel"]', 'input[id*="phone" i]', 'input[placeholder*="telefone" i]'],
  linkedinUrl: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]'],
  city: ['input[name*="city" i]', 'input[placeholder*="cidade" i]'],
  about: ['textarea[name*="about" i]', 'textarea[name*="summary" i]', 'textarea[placeholder*="sobre" i]'],
};

export const gupyAdapter: PlatformAdapter = {
  site: "gupy",
  urls: {
    login: "https://login.gupy.io/candidates/signin",
    signup: "https://login.gupy.io/candidates/signup",
    profile: "https://employability-portal.gupy.io/profile",
  },

  async isLoggedIn({ page }) {
    const url = page.url();
    if (!/gupy\.io/.test(url)) return false;
    if (/signin|signup|login\.gupy\.io/.test(url)) return false;
    return (await page.locator('[data-testid*="user" i], [aria-label*="perfil" i], a[href*="/profile"]').count()) > 0;
  },

  async login(ctx) {
    const probe = async () => {
      await ctx.page.goto(gupyAdapter.urls.profile, { waitUntil: "domcontentloaded" }).catch(() => undefined);
      await pause(800, 1500);
      return gupyAdapter.isLoggedIn(ctx);
    };
    return genericLogin(ctx, {
      loginUrl: gupyAdapter.urls.login,
      email: ['input[name="email"]', 'input[type="email"]', "#email"],
      password: ['input[name="password"]', 'input[type="password"]', "#password"],
      submit: ['button[type="submit"]', 'button:has-text("Entrar")', 'button:has-text("Login")'],
      loggedInProbe: probe,
    });
  },

  async signup(ctx, profile): Promise<SignupResult> {
    const { page, rec } = ctx;
    const block = await gotoChecked(ctx, gupyAdapter.urls.signup, "navigate:signup");
    if (block && block !== "login_required") return { ok: false, waitingHuman: false, blocked: block };

    const name = await firstVisible(page, ['input[name="name"]', 'input[placeholder*="nome" i]']);
    const email = await firstVisible(page, ['input[name="email"]', 'input[type="email"]']);
    const pass = await firstVisible(page, ['input[name="password"]', 'input[type="password"]']);
    if (!name || !email || !pass) {
      await rec.blocked(page, "selector_missing", "signup:form", "formulário de cadastro não reconhecido");
      return { ok: false, waitingHuman: false, blocked: "selector_missing" };
    }
    if (!ctx.creds) {
      await rec.waitingHuman(page, "signup", "defina CRED_GUPY_EMAIL/PASSWORD no .env para o cadastro");
      return { ok: false, waitingHuman: true };
    }

    await humanType(name, profile.fullName, { clear: true });
    await humanType(email, ctx.creds.email, { clear: true });
    await humanType(pass, ctx.creds.password, { clear: true });
    rec.mark("signup:filled", "nome, e-mail e senha preenchidos");

    if (ctx.mode === "DRY_RUN") {
      rec.skip("signup:submit", "DRY_RUN: não enviado");
      return { ok: true, waitingHuman: false };
    }

    // Termos/consentimento, se houver.
    const terms = await firstVisible(page, ['input[type="checkbox"]'], 1000);
    if (terms && !(await terms.isChecked())) await humanClick(page, terms);

    const submit = await firstVisible(page, ['button[type="submit"]', 'button:has-text("Cadastrar")', 'button:has-text("Criar conta")']);
    if (!submit) { await rec.blocked(page, "selector_missing", "signup:submit"); return { ok: false, waitingHuman: false, blocked: "selector_missing" }; }
    await humanClick(page, submit);
    await pause(2500, 4500);

    const after = await detectBlock(page);
    if (after === "captcha" || after === "otp") { await rec.blocked(page, after, "signup:after-submit"); await rec.waitingHuman(page, "signup", `resolva ${after} na janela aberta`); return { ok: false, waitingHuman: true, blocked: after }; }
    await rec.waitingHuman(page, "signup:confirm-email", "Gupy envia e-mail de confirmação; confirme e rode `career login gupy`");
    return { ok: true, waitingHuman: true };
  },

  async syncProfile(ctx, profile: CanonicalProfile): Promise<SyncResult> {
    const block = await gotoChecked(ctx, gupyAdapter.urls.profile, "navigate:profile");
    if (block) return emptySync(block);
    if (!(await gupyAdapter.isLoggedIn(ctx))) { await ctx.rec.blocked(ctx.page, "login_required", "profile"); return emptySync("login_required"); }

    const diffs = await readDiffs(ctx.page, PROFILE_FIELDS, profile);
    ctx.rec.mark("profile:read", `${diffs.filter((d) => d.changed).length} campo(s) divergente(s) de ${diffs.length}`);
    const { applied, skipped } = await applyDiffs(ctx, PROFILE_FIELDS, diffs);

    if (applied > 0) {
      const save = await firstVisible(ctx.page, ['button:has-text("Salvar")', 'button[type="submit"]'], 2000);
      if (save) { await humanClick(ctx.page, save); ctx.rec.mark("profile:save"); } else ctx.rec.skip("profile:save", "botão salvar não encontrado");
    }
    return { diffs, applied, skipped };
  },
};
