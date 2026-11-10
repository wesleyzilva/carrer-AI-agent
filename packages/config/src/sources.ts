export type SiteId = "linkedin" | "indeed" | "gupy" | "glassdoor";
export type Region = "BR" | "WORLD";
export type ApplyMode = "DRY_RUN" | "ASSISTED" | "AUTO";
export type SourceKind = "browser" | "email_alert" | "api" | "rss" | "ats_public";

export interface SourceConfig {
  id: string;
  site: SiteId;
  region: Region;
  rank: number; // 1..3 dentro da região (rascunho; validar no Similarweb)
  kind: SourceKind[];
  /** Modo máximo permitido; sobe manualmente após validação. */
  applyMode: ApplyMode;
  /** false = só descoberta (candidatura redireciona a ATS externo). */
  canApplyNatively: boolean;
  limits: {
    maxPerDay: number;
    minGapMinutes: number;
    maxGapMinutes: number;
  };
  /** Risco de ToS/bloqueio para guiar o padrão conservador. */
  automationRisk: "low" | "medium" | "high";
}

export const SOURCES: SourceConfig[] = [
  {
    id: "br-linkedin",
    site: "linkedin",
    region: "BR",
    rank: 1,
    kind: ["browser", "email_alert"],
    applyMode: "ASSISTED",
    canApplyNatively: true,
    limits: { maxPerDay: 5, minGapMinutes: 4, maxGapMinutes: 8 },
    automationRisk: "high",
  },
  {
    id: "br-indeed",
    site: "indeed",
    region: "BR",
    rank: 2,
    kind: ["email_alert", "browser"],
    applyMode: "DRY_RUN",
    canApplyNatively: true,
    limits: { maxPerDay: 5, minGapMinutes: 3, maxGapMinutes: 7 },
    automationRisk: "medium",
  },
  {
    id: "br-gupy",
    site: "gupy",
    region: "BR",
    rank: 3,
    kind: ["browser"],
    applyMode: "DRY_RUN",
    canApplyNatively: true,
    limits: { maxPerDay: 6, minGapMinutes: 3, maxGapMinutes: 6 },
    automationRisk: "low",
  },
  {
    id: "world-indeed",
    site: "indeed",
    region: "WORLD",
    rank: 1,
    kind: ["email_alert", "browser"],
    applyMode: "DRY_RUN",
    canApplyNatively: true,
    limits: { maxPerDay: 5, minGapMinutes: 3, maxGapMinutes: 7 },
    automationRisk: "medium",
  },
  {
    id: "world-linkedin",
    site: "linkedin",
    region: "WORLD",
    rank: 2,
    kind: ["browser", "email_alert"],
    applyMode: "ASSISTED",
    canApplyNatively: true,
    limits: { maxPerDay: 5, minGapMinutes: 4, maxGapMinutes: 8 },
    automationRisk: "high",
  },
  {
    id: "world-glassdoor",
    site: "glassdoor",
    region: "WORLD",
    rank: 3,
    kind: ["browser", "email_alert"],
    applyMode: "DRY_RUN",
    canApplyNatively: false, // normalmente redireciona ao ATS do empregador / Indeed Apply
    limits: { maxPerDay: 3, minGapMinutes: 4, maxGapMinutes: 8 },
    automationRisk: "high",
  },
];

/** Limite global somado entre todas as fontes (candidaturas/dia). */
export const GLOBAL_LIMITS = { maxPerDay: 10 } as const;
