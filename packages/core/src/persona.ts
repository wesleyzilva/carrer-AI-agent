import { DEFAULT_PERSONA, PERSONAS, type PersonaId, type RoleCluster } from "@career/config";

/**
 * Persona por regra: cluster do cargo vale 10 pontos, cada skill casada vale 2.
 * Empate → ordem da lista (TPM primeiro).
 */
export function selectPersona(cluster: RoleCluster | null, matchedSkills: string[]): PersonaId {
  let best: { id: PersonaId; points: number } | null = null;
  for (const p of PERSONAS) {
    let points = 0;
    if (cluster && p.clusters.includes(cluster)) points += 10;
    for (const s of matchedSkills) if (p.skills.includes(s)) points += 2;
    if (!best || points > best.points) best = { id: p.id, points };
  }
  return best && best.points > 0 ? best.id : DEFAULT_PERSONA;
}
