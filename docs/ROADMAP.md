# Roadmap

Cada fase só começa após consulta ao Context7 das libs envolvidas.

## Fase 0: Fundação
- Monorepo pnpm, TypeScript estrito, Vitest, lint.
- `packages/config` com perfil, empresas, indústrias, skills, pesos.
- `packages/logger` (JSON estruturado).

## Fase 1: Núcleo determinístico
- `packages/core`: hash de vaga/candidatura, detecção de idioma, senioridade, salário/moeda, work model, score, decisão, persona.
- Suíte Vitest com casos reais de vagas (PT e EN).
- **Critério**: score reproduzível, zero IA.

## Fase 2: Persistência
- Drizzle + SQLite: schema, migrations, repositórios, status.
- Verificação de duplicidade (hash, URL, empresa, candidatura).

## Fase 3: Discovery
- Playwright com sessão persistente e comportamento humano.
- Scan incremental + cache; fontes adicionais (ATS públicos).
- Descoberta de empresas e tendências.

## Fase 4: IA local
- Ollama + LanceDB: CV adaptado, cover letter, respostas livres, simulação de entrevista.
- Cache por `input_hash`, idioma automático.

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
