import { PERSONAS, PROFILE, type PersonaId } from "@career/config";
import { inputHash, type Language } from "@career/core";
import type { Job, Repos } from "@career/db";
import { log } from "@career/logger";
import { guardGeneratedText } from "./guard.js";
import { generate, MODELS } from "./ollama.js";

export interface CoverLetterResult {
  id: number;
  content: string;
  cached: boolean;
  model: string;
  guard: { ok: boolean; issues: string[] };
}

/**
 * Cover letter no idioma da vaga, com persona, cache por input_hash e guard anti-alucinação.
 * Regenerar só muda o resultado se a vaga, a persona ou o template mudarem.
 */
export async function generateCoverLetter(repos: Repos, job: Job, opts: { persona?: PersonaId | undefined; force?: boolean | undefined } = {}): Promise<CoverLetterResult> {
  const personaId = opts.persona ?? (job.persona as PersonaId);
  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0]!;
  const lang: Language = job.language === "pt" ? "pt" : "en";
  const model = MODELS.long;
  const TEMPLATE_VERSION = "v1";
  const hash = inputHash("cover_letter", TEMPLATE_VERSION, model, personaId, lang, job.jobHash, (job.description ?? "").slice(0, 3000));

  if (!opts.force) {
    const cached = repos.findGenerated(hash);
    if (cached) return { id: cached.id, content: cached.content, cached: true, model: cached.model, guard: guardGeneratedText(cached.content, [job.companyName, job.title]) };
  }

  const skills = JSON.parse(job.skillsJson) as string[];
  const system =
    lang === "pt"
      ? `Você escreve cartas de apresentação concisas (3 parágrafos, 180 a 260 palavras) em português do Brasil, em primeira pessoa, para ${PROFILE.name}. Use SOMENTE os fatos fornecidos. Nunca invente empresas, métricas, certificações ou ferramentas. Tom profissional e direto, sem clichês. Não inclua cabeçalho, data, endereço ou assinatura. Termine com uma frase de disponibilidade para conversa.`
      : `You write concise cover letters (3 paragraphs, 180–260 words) in English, first person, for ${PROFILE.name}. Use ONLY the facts provided. Never invent companies, metrics, certifications or tools. Professional, direct tone, no clichés. No header, date, address or signature. End with one sentence offering to talk.`;

  const prompt = [
    `Persona: ${persona.label}`,
    `Summary: ${persona.summary[lang]}`,
    `Years of experience: ${PROFILE.yearsOfExperience}`,
    `Strengths: ${PROFILE.strengths.join(", ")}`,
    `Tools actually used: ${PROFILE.tools.join(", ")}`,
    `Domains: ${PROFILE.domains.join(", ")}`,
    `Leadership: ${PROFILE.leadership.join(", ")}`,
    ``,
    `Target job: ${job.title} at ${job.companyName}${job.location ? ` (${job.location})` : ""}`,
    `Skills from the job that match the profile: ${skills.join(", ") || "n/a"}`,
    job.description ? `Job description (excerpt):\n${job.description.slice(0, 2500)}` : "",
    ``,
    lang === "pt" ? "Escreva a carta." : "Write the letter.",
  ].join("\n");

  const { text, durationMs } = await generate(system, prompt, { model, maxTokens: 600, temperature: 0.3 });
  const guard = guardGeneratedText(text, [job.companyName, job.title, ...skills]);
  const saved = repos.saveGenerated({ jobId: job.id, kind: "cover_letter", language: lang, persona: personaId, model, inputHash: hash, content: text });
  repos.logEvent("cover_letter.generated", { guardOk: guard.ok, issues: guard.issues }, { jobId: job.id, durationMs });
  log.info({ action: "cover_letter.generated", company: job.companyName, role: job.title, language: lang, persona: personaId, duration: durationMs, guard: guard.ok });
  return { id: saved.id, content: text, cached: false, model, guard };
}
