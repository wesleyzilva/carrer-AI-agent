import { LEADERSHIP_TITLE_HINTS, ROLE_CLUSTERS, type RoleCluster } from "@career/config";
import { normalizeTitle } from "./normalize.js";

export interface RoleMatch {
  cluster: RoleCluster | null;
  /** 0–100: quão bem o título casa com os cargos-alvo. */
  fit: number;
  matchedTitle: string | null;
}

/** Casa o título com os clusters. Título mais longo casado vence (mais específico). */
export function matchRole(title: string): RoleMatch {
  const t = ` ${normalizeTitle(title)} `;
  let best: RoleMatch = { cluster: null, fit: 0, matchedTitle: null };
  let bestLen = 0;

  for (const cluster of ROLE_CLUSTERS) {
    for (const candidate of cluster.titles) {
      const c = ` ${normalizeTitle(candidate)} `;
      if (t.includes(c) && c.length > bestLen) {
        bestLen = c.length;
        best = { cluster: cluster.id, fit: cluster.fit, matchedTitle: candidate };
      }
    }
  }

  if (best.cluster) return best;

  // Sem cluster: liderança genérica vale algo, cargo técnico IC vale pouco.
  const isLeadership = LEADERSHIP_TITLE_HINTS.some((h) => t.includes(` ${h} `));
  return { cluster: null, fit: isLeadership ? 45 : 15, matchedTitle: null };
}
