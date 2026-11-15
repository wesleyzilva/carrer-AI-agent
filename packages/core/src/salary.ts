import type { Currency, SalaryInfo } from "./types.js";

const EMPTY: SalaryInfo = { min: null, max: null, currency: "unknown", period: "unknown" };

function detectCurrency(text: string): Currency {
  const t = text.toLowerCase();
  if (/r\$|brl|reais/.test(t)) return "BRL";
  if (/us\$|usd|\$(?!\s*r)|dollars?/.test(t)) return "USD";
  if (/€|eur\b|euros?/.test(t)) return "EUR";
  if (/£|gbp|pounds?/.test(t)) return "GBP";
  return "unknown";
}

function detectPeriod(text: string): SalaryInfo["period"] {
  const t = text.toLowerCase();
  if (/(\/|per|por|a)\s*(year|yr|ano|annum|annual|anual)|\bp\.?a\.?\b|\byear\b|\banual\b/.test(t)) return "year";
  if (/(\/|per|por|a)\s*(month|mo|mês|mes|mensal)|\bmonth(ly)?\b|\bmensal\b|\bmês\b/.test(t)) return "month";
  return "unknown";
}

/** Converte "15.000", "15,000", "120k", "1.2m" em número. */
function parseAmount(raw: string): number | null {
  let s = raw.toLowerCase().replace(/\s/g, "");
  let mult = 1;
  if (s.endsWith("k")) { mult = 1_000; s = s.slice(0, -1); }
  else if (s.endsWith("m")) { mult = 1_000_000; s = s.slice(0, -1); }
  // Decide separador decimal: se tem ambos, o último é decimal.
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    const parts = s.split(",");
    const last = parts[parts.length - 1] ?? "";
    s = last.length === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (s.includes(".")) {
    const parts = s.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (last.length === 3 && parts.length >= 2) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * mult;
}

const AMOUNT = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*([km])?/gi;

/**
 * Detecção determinística de salário. Nunca usa IA.
 * Ignora valores muito baixos (provável número de vaga, anos etc.).
 */
export function parseSalary(text: string | undefined | null): SalaryInfo {
  if (!text) return EMPTY;
  const currency = detectCurrency(text);
  const period = detectPeriod(text);

  const amounts: number[] = [];
  for (const m of text.matchAll(AMOUNT)) {
    const n = parseAmount(`${m[1]}${m[2] ?? ""}`);
    if (n !== null && n >= 1000) amounts.push(n);
  }
  if (amounts.length === 0) return { ...EMPTY, currency, period };

  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return { min, max, currency, period };
}

/** Extrai o trecho com salário de uma descrição longa, se existir. */
export function findSalaryText(description: string | undefined): string | undefined {
  if (!description) return undefined;
  const re = /(?:r\$|us\$|usd|\$|€|£)\s?\d[\d.,]*\s?[km]?(?:\s*(?:-|–|—|a|to|até)\s*(?:r\$|us\$|usd|\$|€|£)?\s?\d[\d.,]*\s?[km]?)?(?:[^.\n]{0,40})/i;
  const m = description.match(re);
  return m?.[0];
}
