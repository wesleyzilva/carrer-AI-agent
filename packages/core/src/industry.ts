import { DEFAULT_INDUSTRY_WEIGHT, INDUSTRIES, type IndustryId } from "@career/config";
import { normalizeText } from "./normalize.js";

/**
 * Indústria por palavras-chave ponderadas. Título vale 3x, empresa 2x, descrição 1x.
 * Empata → maior peso de indústria vence.
 */
export function detectIndustry(opts: {
  title: string;
  company?: string | undefined;
  description?: string | undefined;
  companyIndustry?: IndustryId | undefined;
}): { id: IndustryId; weight: number } {
  if (opts.companyIndustry) {
    const cfg = INDUSTRIES.find((i) => i.id === opts.companyIndustry);
    if (cfg) return { id: cfg.id, weight: cfg.weight };
  }

  const title = ` ${normalizeText(opts.title)} `;
  const company = ` ${normalizeText(opts.company)} `;
  const desc = ` ${normalizeText(opts.description)} `;

  let best: { id: IndustryId; weight: number; hits: number } | null = null;
  for (const ind of INDUSTRIES) {
    let hits = 0;
    for (const kw of ind.keywords) {
      const k = normalizeText(kw);
      if (title.includes(k)) hits += 3;
      if (company.includes(k)) hits += 2;
      if (desc.includes(k)) hits += 1;
    }
    if (hits === 0) continue;
    if (!best || hits > best.hits || (hits === best.hits && ind.weight > best.weight)) {
      best = { id: ind.id, weight: ind.weight, hits };
    }
  }
  return best ? { id: best.id, weight: best.weight } : { id: "other", weight: DEFAULT_INDUSTRY_WEIGHT };
}
