import { PROFILE } from "@career/config";
import { normalizeText } from "@career/core";

export interface GuardResult {
  ok: boolean;
  issues: string[];
}

/**
 * Anti-alucinação determinístico: o texto gerado só pode citar ferramentas, domínios
 * e números que existam no perfil. Qualquer "ano de experiência" > perfil ou
 * ferramenta conhecida fora da lista reprova o texto.
 */
export function guardGeneratedText(text: string, extraAllowedTerms: string[] = []): GuardResult {
  const issues: string[] = [];
  const t = normalizeText(text);

  // 1. Anos de experiência: nunca acima do perfil.
  for (const m of t.matchAll(/(\d{1,2})\+?\s*(anos|years?)/g)) {
    const n = Number(m[1]);
    if (n > PROFILE.yearsOfExperience + 1) issues.push(`cita ${n} anos de experiência (perfil: ${PROFILE.yearsOfExperience})`);
  }

  // 2. Ferramentas conhecidas que NÃO estão no perfil (lista de vigilância).
  const WATCHLIST = [
    "kubernetes", "terraform", "snowflake", "kafka", "golang", "rust", "react", "angular", "vue", "django",
    "flask", "spring", "dotnet", ".net", "c#", "cobol", "sap", "oracle ebs", "servicenow", "tableau", "power bi",
    "looker", "airflow", "dbt", "elastic", "splunk", "new relic", "prometheus", "jenkins", "gitlab ci", "argo",
    "pmp", "csm", "psm", "safe agilist", "aws certified", "azure certified", "gcp certified",
  ];
  const allowed = new Set(
    [...PROFILE.tools, ...PROFILE.strengths, ...PROFILE.domains, ...extraAllowedTerms].map((x) => normalizeText(x)),
  );
  for (const term of WATCHLIST) {
    const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`);
    if (re.test(t) && !allowed.has(normalizeText(term))) issues.push(`cita "${term}", que não está no perfil`);
  }

  // 3. Certificações inventadas.
  if (/\b(certified|certifica[çc][aã]o|certificado)\b/.test(t) && !allowed.has("certified")) {
    issues.push("menciona certificação; nenhuma certificação está cadastrada no perfil");
  }

  // 4. Placeholders que o modelo esqueceu de preencher.
  if (/\[(nome|name|empresa|company|cargo|role|data|date)[^\]]*\]/i.test(text)) issues.push("contém placeholder não preenchido");

  return { ok: issues.length === 0, issues };
}
