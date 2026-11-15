import type {
  Decision,
  IndustryId,
  PersonaId,
  RoleCluster,
  Seniority,
  WorkModelKey,
} from "@career/config";

export type Language = "pt" | "en" | "unknown";
export type Currency = "USD" | "BRL" | "EUR" | "GBP" | "unknown";

/** Vaga bruta como chega de qualquer fonte. Só `title`, `company` e `url` são obrigatórios. */
export interface RawJob {
  title: string;
  company: string;
  url: string;
  location?: string | undefined;
  description?: string | undefined;
  /** Texto cru do salário, ex.: "R$ 15.000 - R$ 20.000" ou "$120k–$150k USD". */
  salaryText?: string | undefined;
  /** Dica da fonte sobre modelo de trabalho, se houver. */
  workModelHint?: string | undefined;
  source?: string | undefined;
  postedAt?: string | undefined;
}

export interface SalaryInfo {
  min: number | null;
  max: number | null;
  currency: Currency;
  period: "year" | "month" | "unknown";
}

export interface ScoreBreakdown {
  industry: number;
  company: number;
  role: number;
  skills: number;
  workModel: number;
  international: number;
}

export interface EnrichedJob extends RawJob {
  jobHash: string;
  language: Language;
  seniority: Seniority;
  salary: SalaryInfo;
  workModel: WorkModelKey;
  industry: IndustryId;
  industryWeight: number;
  companyMatch: { name: string; international: boolean; listed: boolean };
  roleCluster: RoleCluster | null;
  roleFit: number;
  skillsMatched: string[];
  score: number;
  breakdown: ScoreBreakdown;
  decision: Decision;
  persona: PersonaId;
}
