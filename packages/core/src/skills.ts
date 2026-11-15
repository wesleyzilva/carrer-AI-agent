import { PRIORITY_SKILLS, SKILLS_FULL_COVERAGE_WEIGHT } from "@career/config";
import { normalizeText } from "./normalize.js";

export interface SkillsMatch {
  matched: string[];
  /** Soma dos pesos das skills casadas. */
  weight: number;
  /** 0–100. */
  coverage: number;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchSkills(...texts: Array<string | undefined>): SkillsMatch {
  const text = ` ${normalizeText(texts.filter(Boolean).join(" "))} `;
  const matched: string[] = [];
  let weight = 0;

  for (const skill of PRIORITY_SKILLS) {
    const hit = skill.aliases.some((alias) => {
      const a = normalizeText(alias);
      // Fronteira de palavra manual, pois \b falha com "pci-dss", "c++" etc.
      const re = new RegExp(`(^|[^a-z0-9])${escapeRe(a)}($|[^a-z0-9])`, "i");
      return re.test(text);
    });
    if (hit) {
      matched.push(skill.name);
      weight += skill.weight;
    }
  }

  const coverage = Math.min(100, Math.round((weight / SKILLS_FULL_COVERAGE_WEIGHT) * 100));
  return { matched, weight, coverage };
}
