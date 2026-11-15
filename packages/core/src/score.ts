import {
  DECISION_THRESHOLDS,
  SCORE_WEIGHTS,
  SENIORITY_ROLE_MULTIPLIER,
  UNLISTED_COMPANY_SCORE,
  WORK_MODEL_SCORE,
  type Decision,
  type Seniority,
  type WorkModelKey,
} from "@career/config";
import type { ScoreBreakdown } from "./types.js";

export interface ScoreInput {
  industryWeight: number;
  companyListed: boolean;
  companyInternational: boolean;
  roleFit: number;
  seniority: Seniority;
  skillsCoverage: number;
  workModel: WorkModelKey;
  currencyIsUsd: boolean;
}

/**
 * Score determinístico 0–100. Cada componente é 0–100 e entra ponderado por SCORE_WEIGHTS.
 * Nunca usa IA.
 */
export function computeScore(input: ScoreInput): { score: number; breakdown: ScoreBreakdown } {
  const industry = clamp(input.industryWeight);
  const company = input.companyListed ? 100 : UNLISTED_COMPANY_SCORE;
  const role = clamp(input.roleFit * SENIORITY_ROLE_MULTIPLIER[input.seniority]);
  const skills = clamp(input.skillsCoverage);
  const workModel = WORK_MODEL_SCORE[input.workModel];
  const international = input.companyInternational ? (input.currencyIsUsd ? 100 : 80) : 30;

  const breakdown: ScoreBreakdown = { industry, company, role, skills, workModel, international };

  const total =
    (industry * SCORE_WEIGHTS.industry +
      company * SCORE_WEIGHTS.company +
      role * SCORE_WEIGHTS.role +
      skills * SCORE_WEIGHTS.skills +
      workModel * SCORE_WEIGHTS.workModel +
      international * SCORE_WEIGHTS.international) /
    100;

  return { score: Math.round(total), breakdown };
}

export function decide(score: number): Decision {
  if (score >= DECISION_THRESHOLDS.autoApply) return "AUTO_APPLY";
  if (score >= DECISION_THRESHOLDS.manualReview) return "MANUAL_REVIEW";
  return "REJECT";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
