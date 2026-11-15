/** Lowercase, sem acentos, espaços colapsados. */
export function normalizeText(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s ]+/g, " ")
    .trim();
}

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "refid",
  "trk",
  "trackingid",
  "originalsubdomain",
  "gh_src",
  "lever-source",
  "source",
  "fbclid",
  "gclid",
];

/** Remove tracking params, fragmento, barra final e normaliza host. */
export function normalizeUrl(input: string): string {
  try {
    const u = new URL(input.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.includes(key.toLowerCase())) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return input.trim().toLowerCase();
  }
}

/** Nome de empresa canônico: remove sufixos societários e pontuação. */
export function normalizeCompany(input: string): string {
  return normalizeText(input)
    .replace(/[.,]/g, "")
    .replace(/\b(ltda|ltd|inc|llc|s\/?a|sa|corp|corporation|co|gmbh|bv|plc|limited)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Título canônico: remove níveis, parênteses e símbolos. */
export function normalizeTitle(input: string): string {
  return normalizeText(input)
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[|/\\\-–—:,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLocation(input: string | undefined): string {
  return normalizeText(input).replace(/[,;]/g, " ").replace(/\s+/g, " ").trim();
}
