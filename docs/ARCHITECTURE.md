# Arquitetura

## Estrutura (monorepo pnpm)

```
career-ai-agent/
├─ apps/
│  ├─ cli/              # ✅ pnpm career: ingest, score, list, cover-letter, answer, apply, stats
│  ├─ dashboard/        # ⬜ Next.js 15 (App Router, Tailwind, shadcn)
│  └─ worker/           # ⬜ agendador: discovery incremental
├─ packages/
│  ├─ config/           # ✅ perfil, empresas, indústrias, cargos, skills, pesos, personas, fontes
│  ├─ core/             # ✅ regras puras: normalização, hashes, idioma, senioridade, salário, work model, indústria, score, persona
│  ├─ db/               # ✅ Drizzle + SQLite (schema, repositórios, dedupe, cache de IA, eventos)
│  ├─ llm/              # ✅ Ollama, motor de respostas, cover letter, guard anti-alucinação
│  ├─ logger/           # ✅ JSON estruturado
│  ├─ vector/           # ⬜ LanceDB: embeddings de respostas, CV
│  ├─ browser/          # ✅ Playwright: sessão persistente, comportamento humano, adaptadores login/signup/profile-sync, timeline
│  └─ mcp/              # ⬜ servidor MCP expondo ferramentas do agente
├─ data/
│  ├─ career.db         # SQLite (gitignored)
│  └─ samples/          # vagas de exemplo para ingest
└─ docs/
```

Pacotes consomem uns aos outros via `workspace:*` apontando para `src/*.ts` (sem build para rodar; `tsx` executa direto). `tsc -b` serve como typecheck.

## Pipeline

1. **Discover**: scan incremental (fontes + LinkedIn com política de segurança). Normaliza e calcula `job_hash`; se já existe, descarta (nunca reprocessa).
2. **Enrich** (determinístico): idioma, senioridade, salário/moeda, modelo de trabalho, indústria, skills.
3. **Score** (determinístico): indústria + empresa + cluster de cargo + skills + modelo de trabalho (+ moeda USD).
4. **Decide**: `>=85` AUTO_APPLY · `70–84` MANUAL_REVIEW · `<70` REJECT.
5. **Persona**: regra por cluster e skills dominantes.
6. **Generate** (Ollama, só se necessário): CV adaptado, cover letter, respostas livres, no idioma da vaga; resultados em cache.
7. **Apply**: checagem de duplicidade (candidatura, empresa, URL, hash), uma candidatura por vez, comportamento humano.
8. **Track**: status, entrevistas, empresas, tendências; alimenta o dashboard.

## Modelo de dados (SQLite)

- `companies(id, name, industry, priority_group, country, growth_notes)`
- `jobs(id, job_hash UNIQUE, company_id, title, location, url UNIQUE, language, seniority, salary_min, salary_max, currency, work_model, skills_json, score, decision, persona, status, discovered_at)`
- `applications(id, application_hash UNIQUE, job_id, persona, resume_version, cover_letter_id, applied_at, status)`
- `interviews(id, application_id, stage, scheduled_at, notes, outcome)`
- `generated_docs(id, job_id, kind, language, model, input_hash, content, created_at)`: cache de IA por `input_hash`
- `events(id, ts, action, payload_json, duration_ms, error)`: espelha o log estruturado

- `job_sources(id, job_id, site, source_url, seen_at)`: uma vaga, várias fontes.
- `answers(id, question_norm, question_hash UNIQUE, answer, language, source, status, use_count, last_used_at)`: banco de respostas.

Hashes (SHA-256, entradas normalizadas: lowercase, sem acentos, sem sufixos societários, URL sem tracking):
- `job_hash = company|title|location` → identidade da vaga entre fontes (sem URL de propósito).
- `application_hash = company|title|location|url` → nunca aplicar duas vezes à mesma URL.
- `input_hash` → cache de artefatos de IA.

## Score (determinístico, 0–100) — `packages/config/src/scoring.ts`

| Componente | Peso | Como é calculado (0–100) |
|---|---|---|
| Indústria | 25 | peso da indústria detectada (100/95/90/85/80/75; 50 se desconhecida). Empresa prioritária define a indústria. |
| Empresa | 15 | 100 se está na lista prioritária; 40 caso contrário |
| Cargo | 25 | fit do cluster (90–100) × multiplicador de senioridade (manager/lead 1.0, senior 0.9, mid 0.6, junior 0.3). Liderança sem cluster: 45; IC: 15 |
| Skills | 20 | soma dos pesos das skills casadas / 12, cap 100 |
| Modelo de trabalho | 10 | remote_usd 100 · remote_br 90 · hybrid 70 · onsite 40 · unknown 60 |
| Internacional | 5 | internacional + USD 100 · internacional 80 · brasileira 30 |

Decisão: `>=85` AUTO_APPLY · `70–84` MANUAL_REVIEW · `<70` REJECT. Todos os pesos são calibráveis sem tocar no core; 35 testes cobrem os casos.

## Camada de IA — `packages/llm`

- Ollama local; `qwen2.5:7b` para respostas curtas, `llama3.1:8b` para cover letter, `mistral:7b` fallback. `temperature 0.2`, `seed 42` para o cache fazer sentido.
- Prompt = fatos do perfil (`PROFILE`) + resumo da persona + trecho da vaga. Só fatos estruturados entram; o modelo não recebe permissão para inventar.
- **Guard anti-alucinação** (`guard.ts`, determinístico): reprova anos de experiência acima do perfil, ferramentas de uma lista de vigilância que não estão no perfil, menção a certificações e placeholders não preenchidos. Texto reprovado continua salvo, mas com `needs_review` e confiança baixa.
- Cache por `input_hash` em `generated_docs`; nunca regerar o mesmo documento.
- Motor de respostas (`answerEngine.ts`): perfil → banco (`answers`) → opções sim/não → Ollama → humano. Respostas humanas aprovadas viram reutilizáveis.
- IA proibida em: salário, score, duplicidade, idioma, senioridade.
- ⬜ LanceDB para similaridade aproximada de perguntas (hoje só match exato por hash).

## Segurança LinkedIn (`packages/browser`)

- `launchPersistentContext` (cookies/sessão em disco).
- Delays aleatórios (distribuição não uniforme), scroll variável, movimento de cursor, digitação com cadência humana.
- Rate limit global, fila serial (1 ação por vez), janelas de operação agendadas.
- Scans incrementais com cache; backoff e parada automática ao detectar captcha/checkpoint.

## Observabilidade

Logger JSON com os campos do brief; spans OpenTelemetry por etapa do pipeline; duração e erro sempre registrados.

## Dashboard

Páginas: Overview (KPIs), Funnel, Jobs (filtros por score/status/persona), Companies, Trends (indústrias, cargos, salário), Interviews.

## Decisões em aberto

- Fontes de vagas além do LinkedIn (ATS públicos como Greenhouse/Lever, RSS, APIs).
- Embeddings locais: modelo via Ollama (ex.: `nomic-embed-text`).
- Se haverá auto-apply real no LinkedIn (risco de conta) ou só preparação assistida na v1.
