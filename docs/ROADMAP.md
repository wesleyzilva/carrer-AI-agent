# Roadmap

Cada fase só começa após consulta ao Context7 das libs envolvidas.

## Fase 0: Fundação ✅
- Monorepo pnpm, TypeScript estrito, Vitest.
- `packages/config` com perfil, empresas, indústrias, skills, pesos, personas, fontes.
- `packages/logger` (JSON estruturado).

## Fase 1: Núcleo determinístico ✅
- `packages/core`: hash de vaga/candidatura, idioma, senioridade, salário/moeda, work model, indústria, score, decisão, persona.
- 35 testes Vitest (PT e EN). Zero IA.

## Fase 2: Persistência ✅
- Drizzle + SQLite (schema idempotente em `migrate.ts`; `drizzle-kit` para evoluções).
- Dedupe por URL normalizada e por hash; `job_sources` liga uma vaga a várias fontes.
- Proteções de candidatura: `application_hash`, candidatura por vaga, status.
- Cache de IA (`generated_docs`), banco de respostas (`answers`), eventos.

## Fase 2.5: CLI ✅
- `pnpm career`: doctor, ingest, score, list, show, status, cover-letter, answer, approve-answer, answers, apply, stats.

## Fase 2.6: Navegador base ✅
- `@career/browser`: sessão persistente por site, comportamento humano, detecção de bloqueio, credenciais via `.env`.
- Adaptadores Gupy, LinkedIn, Indeed, Glassdoor: `login`, `signup` (sempre para em verificação humana), `syncProfile` (diff + correção).
- Timeline: `runs` + `run_events` só com marcos/bloqueios/erros; CLI `runs`, `timeline`.
- ⬜ Validar seletores em execução real (DRY_RUN) em cada site.

## Fase 3: Discovery
- Playwright com sessão persistente e comportamento humano.
- Scan incremental + cache; fontes adicionais (ATS públicos).
- Descoberta de empresas e tendências.

## Fase 4: IA local (parcial ✅)
- ✅ Ollama: cover letter e respostas livres com persona, idioma da vaga, cache por `input_hash`, guard anti-alucinação.
- ✅ Motor de respostas rules-first (perfil → banco → opções → Ollama → humano).
- ⬜ LanceDB: similaridade aproximada no banco de respostas (`nomic-embed-text`).
- ⬜ CV adaptado por persona e simulação de entrevista.

## Fase 5: Dashboard
- Next.js 15: KPIs, funil, vagas, empresas, tendências, entrevistas.

## Fase 6: Aplicação assistida → automática
Especificação completa em `docs/AUTO_APPLY.md`.
- 6a: motor de campos (perfil → banco de respostas → opções → Ollama → humano) + `DRY_RUN` em Gupy e LinkedIn Easy Apply.
- 6b: `ASSISTED` em LinkedIn, Indeed e Gupy; adaptador Glassdoor (descoberta + handoff ao ATS).
- 6c: adaptadores ATS genéricos (Greenhouse, Lever, Ashby, Workable) para P0 internacional.
- 6d: `AUTO` para score >= 85 com limites diários, após validação por site.
- Fila serial, revisão manual (70–84), tracking de entrevistas e ofertas.

## Fase 7: Inteligência de carreira
- Tendências de mercado/salário, crescimento de empresas, insights, MCP server expondo o agente.
