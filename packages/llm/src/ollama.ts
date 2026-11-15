import { Ollama } from "ollama";
import { log } from "@career/logger";

export interface LlmOptions {
  model?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  /** Força saída JSON (format: "json"). */
  json?: boolean | undefined;
}

export const MODELS = {
  default: process.env["OLLAMA_MODEL"] ?? "qwen2.5:7b",
  long: process.env["OLLAMA_MODEL_LONG"] ?? "llama3.1:8b",
  fallback: process.env["OLLAMA_MODEL_FALLBACK"] ?? "mistral:7b",
} as const;

let client: Ollama | null = null;

export function getOllama(): Ollama {
  if (!client) client = new Ollama({ host: process.env["OLLAMA_HOST"] ?? "http://127.0.0.1:11434" });
  return client;
}

/** Verifica se o Ollama responde e se o modelo existe. */
export async function checkOllama(model = MODELS.default): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await getOllama().list();
    const models = res.models.map((m) => m.name);
    const has = models.some((m) => m === model || m.startsWith(`${model}:`) || m.split(":")[0] === model.split(":")[0]);
    return has ? { ok: true, models } : { ok: false, models, error: `modelo ${model} não encontrado; rode: ollama pull ${model}` };
  } catch (err) {
    return { ok: false, models: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Chamada única ao Ollama. Determinística por padrão (temperature 0.2, seed fixa)
 * para que o cache por input_hash faça sentido.
 */
export async function generate(system: string, prompt: string, opts: LlmOptions = {}): Promise<{ text: string; model: string; durationMs: number }> {
  const model = opts.model ?? MODELS.default;
  const start = Date.now();
  const res = await getOllama().chat({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    stream: false,
    ...(opts.json ? { format: "json" as const } : {}),
    options: {
      temperature: opts.temperature ?? 0.2,
      seed: 42,
      num_predict: opts.maxTokens ?? 700,
    },
  });
  const durationMs = Date.now() - start;
  log.debug({ action: "llm.generate", model, duration: durationMs, tokens: res.eval_count });
  return { text: res.message.content.trim(), model, durationMs };
}
