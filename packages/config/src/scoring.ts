/**
 * Pesos do score determinístico (somam 100). Calibrável sem tocar no core.
 */
export const SCORE_WEIGHTS = {
  industry: 25,
  company: 15,
  role: 25,
  skills: 20,
  workModel: 10,
  international: 5,
} as const;

export type ScoreComponent = keyof typeof SCORE_WEIGHTS;

/** Modelo de trabalho → pontuação 0–100 (CLAUDE.md). Nunca rejeita. */
export const WORK_MODEL_SCORE = {
  remote_usd: 100,
  remote_br: 90,
  hybrid: 70,
  onsite: 40,
  unknown: 60,
} as const;

export type WorkModelKey = keyof typeof WORK_MODEL_SCORE;

export const DECISION_THRESHOLDS = {
  autoApply: 85,
  manualReview: 70,
} as const;

export type Decision = "AUTO_APPLY" | "MANUAL_REVIEW" | "REJECT";

/** Cobertura de skills: quantas skills ponderadas são necessárias para 100 no componente. */
export const SKILLS_FULL_COVERAGE_WEIGHT = 12;

/** Empresa não listada: pontuação base no componente empresa. */
export const UNLISTED_COMPANY_SCORE = 40;

/** Senioridade detectada → multiplicador no componente cargo. */
export const SENIORITY_ROLE_MULTIPLIER = {
  junior: 0.3,
  mid: 0.6,
  senior: 0.9,
  lead: 1,
  manager: 1,
  director: 0.95,
  unknown: 0.85,
} as const;

export type Seniority = keyof typeof SENIORITY_ROLE_MULTIPLIER;
