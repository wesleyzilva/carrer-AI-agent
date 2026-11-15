import { PROFILE } from "@career/config";
import type { Language } from "@career/core";

export interface ProfileAnswer {
  /** Regex sobre a pergunta normalizada. */
  match: RegExp;
  answer: (lang: Language) => string;
  /** Pergunta sensível: nunca responder automaticamente. */
  sensitive?: boolean;
}

const pick = (lang: Language, pt: string, en: string) => (lang === "pt" ? pt : en);

/**
 * Mapa determinístico pergunta → resposta a partir do perfil. Primeira etapa da
 * resolução de campos (AUTO_APPLY.md). Sem IA.
 */
export const PROFILE_ANSWERS: ProfileAnswer[] = [
  {
    match: /(anos|years).*(experi[eê]ncia|experience)|(experi[eê]ncia|experience).*(anos|years)/,
    answer: () => String(PROFILE.yearsOfExperience),
  },
  {
    match: /(n[ií]vel|level|fluen|profici).*(ingl[eê]s|english)|(ingl[eê]s|english).*(n[ií]vel|level|fluen|profici)/,
    answer: (l) => pick(l, "Avançado / profissional", "Professional working proficiency"),
  },
  {
    match: /(n[ií]vel|level|fluen).*(portugu[eê]s|portuguese)|(portugu[eê]s|portuguese).*(n[ií]vel|level|fluen)/,
    answer: (l) => pick(l, "Nativo", "Native"),
  },
  {
    match: /(remot|home office|work from home|wfh)/,
    answer: (l) => pick(l, "Sim", "Yes"),
  },
  {
    match: /(realoca|reloca|mudar de cidade|willing to move)/,
    answer: (l) => pick(l, "Não", "No"),
  },
  {
    match: /(autoriza|authoriz|visto|visa|sponsor|work permit|eligible to work)/,
    answer: (l) => pick(l, "Cidadão brasileiro; sem necessidade de visto para trabalho remoto a partir do Brasil.", "Brazilian citizen; no sponsorship needed for remote work from Brazil."),
    sensitive: true,
  },
  {
    match: /(disponib|availab|start date|in[ií]cio|notice period|aviso pr[eé]vio)/,
    answer: (l) => pick(l, "30 dias", "30 days"),
  },
  {
    match: /(cidade|city|localiza|location|onde voc[eê] mora|where are you (based|located))/,
    answer: () => `${PROFILE.location.city}, Brasil`,
  },
  {
    match: /(pa[ií]s|country)/,
    answer: (l) => pick(l, "Brasil", "Brazil"),
  },
  {
    match: /(fuso|timezone|time zone)/,
    answer: () => PROFILE.location.timezone,
  },
  {
    match: /(pretens|sal[aá]r|salary|compensation|remunera)/,
    answer: (l) => pick(l, "A combinar", "Negotiable"),
    sensitive: true,
  },
  {
    match: /(linkedin)/,
    answer: () => process.env["PROFILE_LINKEDIN"] ?? "",
  },
  {
    match: /(github|portfolio|portf[oó]lio|website|site pessoal)/,
    answer: () => process.env["PROFILE_GITHUB"] ?? "",
  },
  {
    match: /(telefone|phone|celular|mobile|whatsapp)/,
    answer: () => process.env["PROFILE_PHONE"] ?? "",
    sensitive: true,
  },
  {
    match: /(^|\s)(e-?mail)(\s|$)/,
    answer: () => process.env["PROFILE_EMAIL"] ?? "",
    sensitive: true,
  },
  {
    match: /(nome completo|full name|^nome$|^name$)/,
    answer: () => PROFILE.name,
  },
  {
    match: /(g[eê]nero|gender|ra[çc]a|race|ethnic|etnia|defici[eê]ncia|disability|veteran|orienta[çc][aã]o sexual|sexual orientation|idade|age|data de nascimento|birth)/,
    answer: (l) => pick(l, "Prefiro não informar", "Prefer not to say"),
    sensitive: true,
  },
  {
    match: /(trabalhou|worked).*(empresa|company).*(antes|before|previously)|ex-?(funcion|employee)/,
    answer: (l) => pick(l, "Não", "No"),
  },
  {
    match: /(como (ficou sabendo|soube)|how did you hear|where did you (hear|find))/,
    answer: (l) => pick(l, "LinkedIn", "LinkedIn"),
  },
];
