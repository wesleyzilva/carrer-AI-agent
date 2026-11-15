import { chromium, type BrowserContext } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { SiteId } from "@career/config";

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

export interface SessionOptions {
  headless?: boolean | undefined;
  /** Pasta base dos perfis; padrão data/browser-profile/<site>. */
  profileDir?: string | undefined;
  locale?: string | undefined;
}

/**
 * Um perfil persistente de navegador por site (cookies, localStorage, sessão).
 * Primeiro login pode ser manual (headless=false); depois o agente reutiliza.
 */
export async function openSession(site: SiteId, opts: SessionOptions = {}): Promise<BrowserContext> {
  const base = opts.profileDir ?? process.env["BROWSER_PROFILE_DIR"] ?? "./data/browser-profile";
  const dir = resolve(process.cwd(), base, site);
  mkdirSync(dir, { recursive: true });

  const headless = opts.headless ?? process.env["BROWSER_HEADLESS"] === "true";
  const ua = UA_POOL[Math.floor(Math.random() * UA_POOL.length)]!;

  const channel = process.env["BROWSER_CHANNEL"]; // ex.: "chrome" para usar o Chrome instalado
  const ctx = await chromium.launchPersistentContext(dir, {
    headless,
    ...(channel ? { channel } : {}),
    viewport: { width: 1366 + Math.floor(Math.random() * 100), height: 768 + Math.floor(Math.random() * 80) },
    userAgent: ua,
    locale: opts.locale ?? (site === "gupy" ? "pt-BR" : "en-US"),
    timezoneId: "America/Sao_Paulo",
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  // Remove o sinal mais óbvio de automação.
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  ctx.setDefaultTimeout(20_000);
  return ctx;
}

export function screenshotDir(): string {
  const dir = resolve(process.cwd(), process.env["SCREENSHOT_DIR"] ?? "./data/screenshots");
  mkdirSync(dir, { recursive: true });
  return dir;
}
