import { humanClick, pause } from "../human.js";
import type { PlatformAdapter, SignupResult, SyncResult } from "../types.js";
import { applyDiffs, emptySync, firstVisible, genericLogin, gotoChecked, readDiffs, type FieldMap } from "./base.js";

/**
 * Indeed: login em duas etapas (e-mail → continuar → senha/código). Frequentemente pede OTP
 * por e-mail: o adaptador para em WAITING_HUMAN e a sessão persistente evita repetir.
 * Mesma conta serve BR e global (muda só o domínio: br.indeed.com / www.indeed.com).
 */
const domain = () => process.env["INDEED_DOMAIN"] ?? "br.indeed.com";

const PROFILE_FIELDS: FieldMap = {
  firstName: ['input[name="firstName"]', 'input[id*="firstName" i]'],
  lastName: ['input[name="lastName"]', 'input[id*="lastName" i]'],
  phone: ['input[name="phoneNumber"]', 'input[type="tel"]'],
  city: ['input[name="location"]', 'input[id*="location" i]', 'input[name*="city" i]'],
  headline: ['input[name="headline"]', 'input[id*="headline" i]', 'input[name*="title" i]'],
  about: ['textarea[name="summary"]', 'textarea[id*="summary" i]'],
};

export const indeedAdapter: PlatformAdapter = {
  site: "indeed",
  urls: {
    login: "https://secure.indeed.com/auth",
    signup: "https://secure.indeed.com/account/register",
    profile: `https://profile.indeed.com/`,
  },

  async isLoggedIn({ page }) {
    if (/secure\.indeed\.com\/auth|\/account\/login/.test(page.url())) return false;
    return (await page.locator('[data-gnav-element-name="AccountMenu"], #AccountMenu, a[href*="/account/"], [aria-label*="account" i]').count()) > 0;
  },

  async login(ctx) {
    const probe = async () => {
      await ctx.page.goto(`https://${domain()}/`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
      await pause(1000, 2000);
      return indeedAdapter.isLoggedIn(ctx);
    };
    const r = await genericLogin(ctx, {
      loginUrl: indeedAdapter.urls.login,
      email: ['input[name="__email"]', "#ifl-InputFormField-3", 'input[type="email"]', 'input[name="email"]'],
      next: ['button[type="submit"]', 'button:has-text("Continue")', 'button:has-text("Continuar")'],
      password: ['input[name="__password"]', 'input[type="password"]'],
      submit: ['button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("Entrar")'],
      loggedInProbe: probe,
    });
    if (!r.ok && !r.blocked) {
      // Indeed costuma oferecer "código por e-mail" em vez de senha.
      await ctx.rec.waitingHuman(ctx.page, "login:otp", "Indeed pediu código por e-mail; digite na janela aberta e rode novamente");
      return { ...r, blocked: "otp" };
    }
    return r;
  },

  async signup(ctx, profile): Promise<SignupResult> {
    const { page, rec } = ctx;
    const block = await gotoChecked(ctx, indeedAdapter.urls.signup, "navigate:signup");
    if (block && block !== "login_required") return { ok: false, waitingHuman: false, blocked: block };
    if (!ctx.creds) { await rec.waitingHuman(page, "signup", "defina CRED_INDEED_EMAIL/PASSWORD no .env"); return { ok: false, waitingHuman: true }; }

    const email = await firstVisible(page, ['input[type="email"]', 'input[name="__email"]', 'input[name="email"]']);
    if (!email) { await rec.blocked(page, "selector_missing", "signup:email"); return { ok: false, waitingHuman: false, blocked: "selector_missing" }; }
    const { humanType } = await import("../human.js");
    await humanType(email, ctx.creds.email, { clear: true });
    rec.mark("signup:email", profile.fullName ? "e-mail preenchido" : undefined);
    if (ctx.mode === "DRY_RUN") { rec.skip("signup:submit", "DRY_RUN"); return { ok: true, waitingHuman: false }; }
    const next = await firstVisible(page, ['button[type="submit"]', 'button:has-text("Continue")', 'button:has-text("Continuar")']);
    if (next) await humanClick(page, next);
    await pause(2000, 4000);
    await rec.waitingHuman(page, "signup:verify", "Indeed envia código/verificação por e-mail; complete na janela e rode `career login indeed`");
    return { ok: true, waitingHuman: true };
  },

  async syncProfile(ctx, profile): Promise<SyncResult> {
    const block = await gotoChecked(ctx, indeedAdapter.urls.profile, "navigate:profile");
    if (block) return emptySync(block);
    if (!(await indeedAdapter.isLoggedIn(ctx))) { await ctx.rec.blocked(ctx.page, "login_required", "profile"); return emptySync("login_required"); }

    // O perfil do Indeed abre campos em modo de edição por seção; tenta "Editar" genérico primeiro.
    const edit = await firstVisible(ctx.page, ['button[aria-label*="Edit" i]', 'button:has-text("Edit")', 'button:has-text("Editar")'], 2500);
    if (edit) { await humanClick(ctx.page, edit); await pause(1000, 2000); }

    const diffs = await readDiffs(ctx.page, PROFILE_FIELDS, profile);
    ctx.rec.mark("profile:read", `${diffs.filter((d) => d.changed).length} campo(s) divergente(s) de ${diffs.length}`);
    const { applied, skipped } = await applyDiffs(ctx, PROFILE_FIELDS, diffs);
    if (applied > 0) {
      const save = await firstVisible(ctx.page, ['button:has-text("Save")', 'button:has-text("Salvar")', 'button[type="submit"]'], 2000);
      if (save) { await humanClick(ctx.page, save); ctx.rec.mark("profile:save"); } else ctx.rec.skip("profile:save", "botão salvar não encontrado");
    }
    return { diffs, applied, skipped };
  },
};
