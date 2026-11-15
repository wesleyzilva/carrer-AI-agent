import { PERSONAS, PROFILE, type PersonaId } from "@career/config";
import { detectLanguage, inputHash, normalizeText, type Language } from "@career/core";
import type { Repos } from "@career/db";
import { log } from "@career/logger";
import { guardGeneratedText } from "./guard.js";
import { generate, MODELS } from "./ollama.js";
import { PROFILE_ANSWERS } from "./profileAnswers.js";

export type Resolver = "profile" | "bank" | "options" | "llm" | "human";

export interface FieldQuestion {
  label: string;
  type?: "text" | "textarea" | "select" | "radio" | "checkbox" | "number" | undefined;
  options?: string[] | undefined;
  required?: boolean | undefined;
  maxLength?: number | undefined;
}

export interface JobContext {
  jobId?: number | undefined;
  title: string;
  company: string;
  description?: string | undefined;
  language?: Language | undefined;
  persona?: PersonaId | undefined;
}

export interface ResolvedAnswer {
  question: string;
  answer: string;
  resolver: Resolver;
  confidence: number; // 0–1
  needsReview: boolean;
  reason?: string | undefined;
}

/**
 * Motor de respostas rules-first (AUTO_APPLY.md):
 * 1. perfil → 2. banco de respostas → 3. opções → 4. Ollama → 5. humano.
 */
export class AnswerEngine {
  constructor(private readonly repos: Repos, private readonly opts: { allowLlm?: boolean | undefined } = {}) {}

  async resolve(q: FieldQuestion, ctx: JobContext): Promise<ResolvedAnswer> {
    const lang = ctx.language ?? detectLanguage(q.label, ctx.description) ?? "en";
    const qNorm = normalizeText(q.label);
    const qHash = inputHash("q", qNorm);

    // 1. Perfil
    for (const rule of PROFILE_ANSWERS) {
      if (rule.match.test(qNorm)) {
        const answer = rule.answer(lang);
        if (!answer) break; // variável de ambiente ausente → cai para humano
        if (rule.sensitive) {
          return { question: q.label, answer, resolver: "profile", confidence: 0.6, needsReview: true, reason: "campo sensível" };
        }
        const fitted = this.fitToOptions(answer, q.options);
        return { question: q.label, answer: fitted ?? answer, resolver: "profile", confidence: fitted || !q.options ? 0.95 : 0.5, needsReview: !!q.options && !fitted };
      }
    }

    // 2. Banco de respostas (match exato por hash)
    const banked = this.repos.findAnswer(qHash);
    if (banked) {
      this.repos.touchAnswer(banked.id);
      const fitted = this.fitToOptions(banked.answer, q.options);
      return {
        question: q.label,
        answer: fitted ?? banked.answer,
        resolver: "bank",
        confidence: banked.status === "approved" ? 0.9 : 0.6,
        needsReview: banked.status !== "approved",
      };
    }

    // 3. Opções: sim/não e correspondências óbvias
    if (q.options && q.options.length > 0) {
      const yesNo = this.resolveYesNo(qNorm, q.options, lang);
      if (yesNo) return { question: q.label, answer: yesNo, resolver: "options", confidence: 0.7, needsReview: false };
    }

    // 4. Ollama para texto livre
    if (this.opts.allowLlm !== false && (q.type === "textarea" || q.type === "text" || q.type === undefined) && !q.options) {
      const generated = await this.generateFreeText(q, ctx, lang);
      if (generated) {
        this.repos.saveAnswer({ questionNorm: qNorm, questionHash: qHash, answer: generated.answer, language: lang, source: "llm", status: "needs_review" });
        return generated;
      }
    }

    // 5. Humano
    return { question: q.label, answer: "", resolver: "human", confidence: 0, needsReview: true, reason: "sem resolução automática" };
  }

  /** Grava resposta humana aprovada no banco para reutilização. */
  approveHuman(question: string, answer: string, language: Language) {
    const qNorm = normalizeText(question);
    return this.repos.saveAnswer({ questionNorm: qNorm, questionHash: inputHash("q", qNorm), answer, language, source: "human", status: "approved" });
  }

  private fitToOptions(answer: string, options: string[] | undefined): string | null {
    if (!options?.length) return null;
    const a = normalizeText(answer);
    const exact = options.find((o) => normalizeText(o) === a);
    if (exact) return exact;
    const partial = options.find((o) => normalizeText(o).includes(a) || a.includes(normalizeText(o)));
    return partial ?? null;
  }

  private resolveYesNo(qNorm: string, options: string[], lang: Language): string | null {
    const yes = options.find((o) => /^(sim|yes|y)$/i.test(o.trim()));
    const no = options.find((o) => /^(n[aã]o|no|n)$/i.test(o.trim()));
    if (!yes || !no) return null;
    if (/(remot|agile|ágil|scrum|lideran|leadership|gest[aã]o|management|stakeholder|cloud|dados|data|ingl[eê]s|english)/.test(qNorm)) return yes;
    if (/(realoca|reloca|visto|visa|sponsor|presencial|on-?site|ex-?funcion|former employee)/.test(qNorm)) return no;
    void lang;
    return null;
  }

  private async generateFreeText(q: FieldQuestion, ctx: JobContext, lang: Language): Promise<ResolvedAnswer | null> {
    const persona = PERSONAS.find((p) => p.id === (ctx.persona ?? "agentic_tpm")) ?? PERSONAS[0]!;
    const maxChars = q.maxLength ?? 900;
    const system =
      lang === "pt"
        ? `Você escreve respostas curtas de formulário de candidatura em primeira pessoa, em português do Brasil, para ${PROFILE.name}. Use SOMENTE os fatos abaixo. Nunca invente empresas, números, certificações ou ferramentas. Máximo ${maxChars} caracteres. Sem saudação, sem assinatura.`
        : `You write short job-application form answers in first person, in English, for ${PROFILE.name}. Use ONLY the facts below. Never invent companies, numbers, certifications or tools. Max ${maxChars} characters. No greeting, no signature.`;
    const facts = [
      `Persona: ${persona.label}. ${persona.summary[lang === "pt" ? "pt" : "en"]}`,
      `Years of experience: ${PROFILE.yearsOfExperience}`,
      `Strengths: ${PROFILE.strengths.join(", ")}`,
      `Tools: ${PROFILE.tools.join(", ")}`,
      `Domains: ${PROFILE.domains.join(", ")}`,
      `Leadership: ${PROFILE.leadership.join(", ")}`,
    ].join("\n");
    const prompt = `${facts}\n\nJob: ${ctx.title} at ${ctx.company}\n${ctx.description ? `Job description (excerpt): ${ctx.description.slice(0, 1200)}\n` : ""}\nQuestion: ${q.label}\n\nAnswer:`;

    try {
      const { text } = await generate(system, prompt, { model: MODELS.default, maxTokens: Math.ceil(maxChars / 3) });
      const answer = text.slice(0, maxChars);
      const guard = guardGeneratedText(answer, [ctx.company, ctx.title]);
      return {
        question: q.label,
        answer,
        resolver: "llm",
        confidence: guard.ok ? 0.65 : 0.3,
        needsReview: true,
        reason: guard.ok ? "gerado por IA" : `gerado por IA; guard: ${guard.issues.join("; ")}`,
      };
    } catch (err) {
      log.warn({ action: "answer.llm_failed", error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }
}
