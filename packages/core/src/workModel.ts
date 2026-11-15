import type { WorkModelKey } from "@career/config";
import type { Currency } from "./types.js";
import { normalizeText } from "./normalize.js";

const REMOTE = /\b(remote|remoto|remota|home office|home-office|work from home|wfh|100% remoto|fully remote|anywhere)\b/;
const HYBRID = /\b(hybrid|híbrido|hibrido|hibrida|híbrida|flex(ível|ivel)?)\b/;
const ONSITE = /\b(on-?site|presencial|in[- ]office|no escritório|no escritorio)\b/;

export function detectWorkModel(opts: {
  title?: string | undefined;
  location?: string | undefined;
  description?: string | undefined;
  hint?: string | undefined;
  currency: Currency;
  companyInternational: boolean;
}): WorkModelKey {
  const hint = normalizeText(opts.hint);
  const head = normalizeText([opts.title, opts.location].filter(Boolean).join(" "));
  const desc = normalizeText(opts.description).slice(0, 1500);

  const isRemote = REMOTE.test(hint) || REMOTE.test(head) || (REMOTE.test(desc) && !HYBRID.test(desc) && !ONSITE.test(desc));
  const isHybrid = HYBRID.test(hint) || HYBRID.test(head) || HYBRID.test(desc);
  const isOnsite = ONSITE.test(hint) || ONSITE.test(head) || (ONSITE.test(desc) && !isRemote && !isHybrid);

  if (isHybrid && !REMOTE.test(hint) && !REMOTE.test(head)) return "hybrid";
  if (isRemote) {
    if (opts.currency === "USD" || opts.currency === "EUR" || opts.currency === "GBP") return "remote_usd";
    if (opts.currency === "BRL") return "remote_br";
    // Sem moeda: localização que cita Brasil indica contratação local.
    if (/\b(brasil|brazil|latam|america latina|latin america)\b/.test(head)) return "remote_br";
    return opts.companyInternational ? "remote_usd" : "remote_br";
  }
  if (isOnsite) return "onsite";
  return "unknown";
}
