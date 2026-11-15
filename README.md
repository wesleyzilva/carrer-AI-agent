# CareerAI Agent

Plataforma local-first que descobre, pontua e prepara candidaturas alinhadas ao perfil de Wesley Gomes da Silva. Regras determinísticas primeiro; IA local (Ollama) só para texto livre.

Regras e perfil: `CLAUDE.md`. Arquitetura: `docs/ARCHITECTURE.md`. Roadmap: `docs/ROADMAP.md`. Candidatura automatizada: `docs/AUTO_APPLY.md`.

## Pré-requisitos

- Node.js 22+
- pnpm 10 (`npm i -g pnpm`)
- Ollama com `qwen2.5:7b` e `llama3.1:8b` (`ollama pull qwen2.5:7b && ollama pull llama3.1:8b`)

## Setup

```bash
pnpm install
copy .env.example .env     # ajuste PROFILE_* se quiser respostas automáticas de contato
pnpm typecheck
pnpm test
pnpm career doctor
```

O banco SQLite é criado automaticamente em `data/career.db` na primeira execução.

## Uso

```bash
# Importar vagas (JSON com array de {title, company, url, location?, description?, salaryText?, source?})
pnpm career ingest data/samples/jobs.sample.json

# Pontuar uma vaga sem salvar
pnpm career score -t "Technical Program Manager" -c "Stripe" -l "Remote" -s "$150k USD" -d "..."

# Listar por score / status
pnpm career list
pnpm career list --status REVIEW
pnpm career show 3

# Aprovar manualmente uma vaga em REVIEW
pnpm career status 4 DISCOVERED

# Cover letter no idioma da vaga (Ollama; cacheada por input_hash)
pnpm career cover-letter 1
pnpm career cover-letter 1 --persona agile_leader --force

# Responder pergunta de formulário: perfil → banco → Ollama → humano
pnpm career answer 1 "Why do you want to join us?"
pnpm career answer 1 "Willing to relocate?" --options "Yes,No" --no-llm
pnpm career approve-answer "Why do you want to join us?" "Because..." --lang en
pnpm career answers --status needs_review

# Registrar candidatura (com todas as proteções de duplicidade)
pnpm career apply 1 --mode ASSISTED

# Métricas
pnpm career stats

# Navegador (ver docs/BROWSER.md): login, cadastro, correção de perfil, timeline de bloqueios
pnpm browsers:install
pnpm career login gupy
pnpm career signup gupy --mode DRY_RUN
pnpm career profile-sync linkedin              # diff; --mode ASSISTED aplica
pnpm career timeline                           # bloqueios/erros por site
pnpm career timeline 3                         # marcos da execução #3
```

## Pacotes

| Pacote | Responsabilidade |
|---|---|
| `@career/config` | Perfil, empresas, indústrias, cargos, skills, pesos, personas, fontes |
| `@career/core` | Funções puras: normalização, hashes, idioma, senioridade, salário, modelo de trabalho, indústria, score, decisão, persona |
| `@career/db` | SQLite + Drizzle: schema, repositórios, dedupe, cache de IA, eventos |
| `@career/llm` | Ollama, motor de respostas rules-first, cover letter, guard anti-alucinação |
| `@career/browser` | Playwright: sessão persistente, comportamento humano, adaptadores (login/signup/profile-sync), timeline de bloqueios |
| `@career/logger` | Log JSON estruturado |
| `@career/cli` | Comandos acima |

## Garantias

- Score, idioma, senioridade, salário, duplicidade: 100% determinísticos, cobertos por testes.
- Mesma vaga nunca é processada duas vezes (URL normalizada + hash empresa/título/local).
- Nunca aplica duas vezes (`application_hash` + checagem por vaga + status).
- Texto gerado por IA entra como `needs_review` e passa pelo guard (anos, ferramentas, certificações, placeholders).
- Mesma entrada → mesmo documento (cache por `input_hash`, seed fixa no Ollama).

## Próximos passos

Ver `docs/ROADMAP.md`: discovery (Playwright/ATS), LanceDB para busca aproximada de respostas, dashboard Next.js, DRY_RUN em Gupy e LinkedIn.
