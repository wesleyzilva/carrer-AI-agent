import type { SiteId } from "@career/config";
import type { Credentials } from "./types.js";

/**
 * Credenciais por plataforma vindas do .env (nunca do repositório):
 *   CRED_LINKEDIN_EMAIL / CRED_LINKEDIN_PASSWORD
 *   CRED_INDEED_EMAIL   / CRED_INDEED_PASSWORD
 *   CRED_GUPY_EMAIL     / CRED_GUPY_PASSWORD
 *   CRED_GLASSDOOR_EMAIL/ CRED_GLASSDOOR_PASSWORD
 * Fallback: CRED_DEFAULT_EMAIL / CRED_DEFAULT_PASSWORD.
 */
export function getCredentials(site: SiteId): Credentials | null {
  const key = site.toUpperCase();
  const email = process.env[`CRED_${key}_EMAIL`] ?? process.env["CRED_DEFAULT_EMAIL"];
  const password = process.env[`CRED_${key}_PASSWORD`] ?? process.env["CRED_DEFAULT_PASSWORD"];
  if (!email || !password) return null;
  return { email, password };
}

/** Mascarar em logs/timeline. */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}
