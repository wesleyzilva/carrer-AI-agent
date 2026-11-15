import { createHash } from "node:crypto";
import { normalizeCompany, normalizeLocation, normalizeTitle, normalizeUrl } from "./normalize.js";

function sha256(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/**
 * Hash de identidade da vaga (dedupe entre fontes): empresa + título + localização.
 * Não inclui URL de propósito, pois a mesma vaga tem URLs diferentes em cada site.
 */
export function jobIdentityHash(company: string, title: string, location?: string): string {
  return sha256([normalizeCompany(company), normalizeTitle(title), normalizeLocation(location)]);
}

/**
 * application_hash (CLAUDE.md): company + title + location + url, normalizados.
 * Garante que nunca se aplica duas vezes à mesma URL de vaga.
 */
export function applicationHash(company: string, title: string, location: string | undefined, url: string): string {
  return sha256([
    normalizeCompany(company),
    normalizeTitle(title),
    normalizeLocation(location),
    normalizeUrl(url),
  ]);
}

/** Hash de cache para artefatos de IA: mesma entrada → mesmo documento. */
export function inputHash(...parts: string[]): string {
  return sha256(parts.map((p) => p.trim()));
}
