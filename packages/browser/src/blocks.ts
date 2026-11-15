import type { Page } from "playwright";
import type { BlockReason } from "@career/db";

/**
 * Detecção determinística de bloqueios. Ordem importa: captcha > otp > checkpoint > login.
 * Retorna null quando a página parece normal.
 */
export async function detectBlock(page: Page): Promise<BlockReason | null> {
  const url = page.url().toLowerCase();
  let text = "";
  try {
    text = (await page.locator("body").innerText({ timeout: 3000 })).toLowerCase().slice(0, 20_000);
  } catch {
    return null;
  }

  const has = (...needles: string[]) => needles.some((n) => text.includes(n) || url.includes(n));

  if (
    (await page.locator('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[title*="captcha" i], iframe[src*="arkoselabs"], #captcha, .g-recaptcha').count()) > 0 ||
    has("captcha", "verify you are human", "prove you're human", "não sou um robô", "nao sou um robo", "unusual traffic")
  ) return "captcha";

  if (has("verification code", "código de verificação", "codigo de verificacao", "enter the code", "digite o código", "one-time", "two-step", "2-step", "autenticação de dois fatores", "two-factor"))
    return "otp";

  if (has("/checkpoint/", "security check", "verificação de segurança", "let's do a quick security check", "confirm it's you", "confirme sua identidade", "suspicious", "atividade incomum", "account restricted", "conta restrita", "temporarily restricted"))
    return "checkpoint";

  if (has("too many requests", "rate limit", "try again later", "tente novamente mais tarde", "429"))
    return "rate_limit";

  if (has("/login", "/signin", "/authwall", "/uas/login", "sign in to continue", "faça login para continuar", "entre para continuar"))
    return "login_required";

  return null;
}
