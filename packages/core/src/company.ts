import { PRIORITY_COMPANIES, type CompanyConfig } from "@career/config";
import { normalizeCompany } from "./normalize.js";

export interface CompanyMatch {
  name: string;
  listed: boolean;
  international: boolean;
  config: CompanyConfig | null;
}

const BR_HINTS = /\b(brasil|brazil|ltda|s\.?a\.?|eireli|me)\b/;

/** Casa a empresa da vaga com a lista prioritária; se não achar, infere se é internacional. */
export function matchCompany(company: string, location?: string): CompanyMatch {
  const norm = normalizeCompany(company);
  for (const cfg of PRIORITY_COMPANIES) {
    if (cfg.aliases.some((a) => norm === a || norm.startsWith(`${a} `) || norm.includes(` ${a} `) || norm.endsWith(` ${a}`))) {
      return { name: cfg.name, listed: true, international: cfg.international, config: cfg };
    }
  }
  const loc = normalizeCompany(location ?? "");
  const looksBrazilian = BR_HINTS.test(norm) || /\b(brasil|brazil|sao paulo|rio de janeiro|belo horizonte|curitiba|porto alegre|recife|florianopolis|campinas|brasilia)\b/.test(loc);
  return { name: company.trim(), listed: false, international: !looksBrazilian, config: null };
}
