import { PERSONAS, PROFILE, type PersonaId } from "@career/config";

/**
 * Perfil canônico que deve estar igual em todas as plataformas.
 * Dados públicos vêm de PROFILE; contato vem do .env (PROFILE_*).
 */
export interface CanonicalProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  headline: string;
  about: string;
  linkedinUrl: string;
  yearsOfExperience: string;
  englishLevel: string;
  skills: string;
}

export function buildCanonicalProfile(opts: { persona?: PersonaId | undefined; lang?: "pt" | "en" | undefined } = {}): CanonicalProfile {
  const lang = opts.lang ?? "en";
  const persona = PERSONAS.find((p) => p.id === (opts.persona ?? "agentic_tpm")) ?? PERSONAS[0]!;
  const [firstName = "", ...rest] = PROFILE.name.split(" ");
  const lastName = rest.join(" ");

  const headline = process.env["PROFILE_HEADLINE"] ?? (lang === "pt"
    ? `${persona.label} | Cloud & Data Migration | Cybersecurity | Payments | Agile | IA`
    : `${persona.label} | Cloud & Data Migration | Cybersecurity | Payments | Agile | AI`);

  const about = process.env["PROFILE_ABOUT"] ?? [
    persona.summary[lang],
    lang === "pt"
      ? `Domínios: ${PROFILE.domains.join(", ")}. Ferramentas: ${PROFILE.tools.slice(0, 12).join(", ")}.`
      : `Domains: ${PROFILE.domains.join(", ")}. Tools: ${PROFILE.tools.slice(0, 12).join(", ")}.`,
  ].join("\n\n");

  return {
    fullName: PROFILE.name,
    firstName,
    lastName,
    email: process.env["PROFILE_EMAIL"] ?? "",
    phone: process.env["PROFILE_PHONE"] ?? "",
    city: PROFILE.location.city,
    state: process.env["PROFILE_STATE"] ?? "SP",
    country: lang === "pt" ? "Brasil" : "Brazil",
    headline,
    about,
    linkedinUrl: process.env["PROFILE_LINKEDIN"] ?? "",
    yearsOfExperience: String(PROFILE.yearsOfExperience),
    englishLevel: lang === "pt" ? "Avançado" : "Professional",
    skills: [...new Set([...persona.skills, ...PROFILE.tools])].slice(0, 30).join(", "),
  };
}

/** Compara texto normalizado (espaços e caixa) para decidir se um campo precisa mudar. */
export function sameValue(a: string | null | undefined, b: string | null | undefined): boolean {
  const n = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return n(a) === n(b);
}
