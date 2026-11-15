import type { Seniority } from "@career/config";
import { normalizeText } from "./normalize.js";

interface Rule {
  level: Seniority;
  patterns: RegExp[];
}

/** Ordem importa: do mais alto para o mais baixo, primeiro match vence. */
const RULES: Rule[] = [
  { level: "director", patterns: [/\b(director|diretor|diretora|vp|vice president|head of|head de|chief)\b/] },
  { level: "manager", patterns: [/\b(manager|gerente|coordenador|coordenadora|coordinator|supervisor)\b/] },
  { level: "lead", patterns: [/\b(lead|líder|lider|principal|staff|tech lead|team lead)\b/] },
  { level: "senior", patterns: [/\b(senior|sênior|senior|sr\.?|iii|especialista|specialist)\b/] },
  { level: "junior", patterns: [/\b(junior|júnior|jr\.?|estagi[aá]rio|intern|trainee|entry level|assistente)\b/] },
  { level: "mid", patterns: [/\b(pleno|mid|mid-level|ii|analista)\b/] },
];

export function detectSeniority(title: string, description?: string): Seniority {
  const t = normalizeText(title);
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(t))) return rule.level;
  }
  // Fallback: olhar só o começo da descrição para não captar "reporta ao gerente".
  const d = normalizeText(description).slice(0, 400);
  for (const rule of RULES) {
    if (rule.level === "manager" || rule.level === "director") continue;
    if (rule.patterns.some((p) => p.test(d))) return rule.level;
  }
  return "unknown";
}
