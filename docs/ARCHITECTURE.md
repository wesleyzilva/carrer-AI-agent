# Arquitetura

## Estrutura proposta (monorepo pnpm)

```
career-ai-agent/
├─ apps/
│  ├─ dashboard/        # Next.js 15 (App Router, Tailwind, shadcn)
│  └─ worker/           # CLI/agendador: discovery, scoring, apply
├─ packages/
│  ├─ core/             # regras puras: score, hash, idioma, senioridade, salário, persona
│  ├─ config/           # perfil, empresas, indústrias, skills, pesos (JSON/TS tipado)
│  ├─ db/               # Drizzle + SQLite (schema, migrations, repositórios)
│  ├─ vector/           # LanceDB: embeddings de vagas, CV, respostas
│  ├─ llm/              # cliente Ollama, prompts, cache de respostas
│  ├─ browser/          # Playwright: sessão persistente, comportamento humano
│  ├─ mcp/              # servidor MCP expondo ferramentas do agente
│  └─ logger/           # JSON estruturado + OpenTelemetry
└─ docs/
```

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

Hashes: SHA-256 de `company|title|location|url` normalizados (lowercase, trim, sem tracking params).

## Score (esboço determinístico, 0–100)

| Componente | Peso sugerido |
|---|---|
| Indústria (100/95/90/85/80/75) | 25 |
| Empresa prioritária | 15 |
| Cluster/cargo-alvo | 25 |
| Skills priorizadas (cobertura) | 20 |
| Modelo de trabalho (100/90/70/40) | 10 |
| Moeda USD / empresa internacional (P0) | 5 |

Pesos calibráveis em `packages/config`; cobrir tudo com testes Vitest (tabela de casos).

## Camada de IA

- Ollama local; `qwen2.5:7b` padrão, `llama3.1:8b` para texto longo em EN, `mistral:7b` como fallback.
- Prompt = regras + trechos recuperados do LanceDB (CV, projetos) para reduzir contexto.
- Cache por `input_hash`; nunca regerar o mesmo documento.
- IA proibida em: salário, score, duplicidade, idioma, senioridade.

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
