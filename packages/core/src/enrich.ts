import type { EnrichedJob, RawJob } from "./types.js";
import { jobIdentityHash } from "./hash.js";
import { detectLanguage } from "./language.js";
import { detectSeniority } from "./seniority.js";
import { findSalaryText, parseSalary } from "./salary.js";
import { detectWorkModel } from "./workModel.js";
import { detectIndustry } from "./industry.js";
import { matchCompany } from "./company.js";
import { matchRole } from "./role.js";
import { matchSkills } from "./skills.js";
import { computeScore, decide } from "./score.js";
import { selectPersona } from "./persona.js";

/** Pipeline determinístico completo: RawJob → EnrichedJob. Zero IA. */
export function enrichJob(raw: RawJob): EnrichedJob {
  const company = matchCompany(raw.company, raw.location);
  const salary = parseSalary(raw.salaryText ?? findSalaryText(raw.description));
  const language = detectLanguage(raw.title, raw.description);
  const seniority = detectSeniority(raw.title, raw.description);
  const workModel = detectWorkModel({
    title: raw.title,
    location: raw.location,
    description: raw.description,
    hint: raw.workModelHint,
    currency: salary.currency,
    companyInternational: company.international,
  });
  const industry = detectIndustry({
    title: raw.title,
    company: raw.company,
    description: raw.description,
    companyIndustry: company.config?.industry,
  });
  const role = matchRole(raw.title);
  const skills = matchSkills(raw.title, raw.description);

  const { score, breakdown } = computeScore({
    industryWeight: industry.weight,
    companyListed: company.listed,
    companyInternational: company.international,
    roleFit: role.fit,
    seniority,
    skillsCoverage: skills.coverage,
    workModel,
    currencyIsUsd: salary.currency === "USD",
  });

  return {
    ...raw,
    jobHash: jobIdentityHash(raw.company, raw.title, raw.location),
    language,
    seniority,
    salary,
    workModel,
    industry: industry.id,
    industryWeight: industry.weight,
    companyMatch: { name: company.name, international: company.international, listed: company.listed },
    roleCluster: role.cluster,
    roleFit: role.fit,
    skillsMatched: skills.matched,
    score,
    breakdown,
    decision: decide(score),
    persona: selectPersona(role.cluster, skills.matched),
  };
}
