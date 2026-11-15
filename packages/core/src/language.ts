import type { Language } from "./types.js";
import { normalizeText } from "./normalize.js";

const PT_MARKERS = [
  " e ", " de ", " da ", " do ", " das ", " dos ", " para ", " com ", " em ", " na ", " no ", " nas ", " nos ",
  " uma ", " um ", " que ", " não ", " nao ", " você ", " voce ", " vaga ", " experiência ", " experiencia ",
  " conhecimento ", " requisitos ", " atividades ", " responsabilidades ", " beneficios ", " benefícios ",
  " remoto ", " híbrido ", " hibrido ", " presencial ", " salário ", " salario ", " empresa ", " equipe ", " time ",
  " gerente ", " coordenador ", " desenvolvimento ", " projetos ", " programas ", " clt ", " pj ",
];

const EN_MARKERS = [
  " the ", " and ", " of ", " to ", " with ", " for ", " in ", " on ", " a ", " an ", " you ", " we ", " our ",
  " will ", " are ", " is ", " experience ", " requirements ", " responsibilities ", " benefits ", " remote ",
  " hybrid ", " onsite ", " salary ", " team ", " manager ", " years ", " skills ", " role ", " job ", " work ",
  " ability ", " strong ", " across ", " including ", " must ", " should ",
];

/**
 * Detecção determinística PT/EN por contagem de marcadores.
 * Retorna "unknown" quando não há texto suficiente ou empate.
 */
export function detectLanguage(...texts: Array<string | undefined>): Language {
  const text = ` ${normalizeText(texts.filter(Boolean).join(" "))} `;
  if (text.trim().length < 8) return "unknown";

  const count = (markers: string[]) =>
    markers.reduce((acc, m) => acc + (text.split(m).length - 1), 0);

  const pt = count(PT_MARKERS);
  const en = count(EN_MARKERS);

  if (pt === 0 && en === 0) return "unknown";
  if (pt > en * 1.2) return "pt";
  if (en > pt * 1.2) return "en";
  return pt >= en ? "pt" : "en";
}
