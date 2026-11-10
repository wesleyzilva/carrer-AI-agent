# CareerAI Agent: índice da documentação

Fonte de verdade: `../CLAUDE.md`. Este índice organiza os documentos e aponta os diagramas FigJam equivalentes.

## Mapa

| Documento | Conteúdo | Diagrama FigJam |
|---|---|---|
| `../CLAUDE.md` | Perfil, prioridades, pesos, regras de score, política de IA, segurança LinkedIn | n/a |
| `ARCHITECTURE.md` | Monorepo, pipeline, modelo de dados, score, camada de IA | Pipeline, Modelo de dados |
| `ROADMAP.md` | Fases 0 a 7 | Roadmap (gantt) |
| `AUTO_APPLY.md` | Modos DRY_RUN/ASSISTED/AUTO, resolução de campos, adaptadores | Fluxo de candidatura |

## Ordem de leitura

1. `CLAUDE.md`: regras e restrições.
2. `ARCHITECTURE.md`: como as peças se conectam.
3. `ROADMAP.md`: ordem de construção.
4. `AUTO_APPLY.md`: especificação da fase 6.

## Decisões em aberto

- Fontes além do LinkedIn (Greenhouse, Lever, RSS, APIs).
- Modelo de embeddings local (ex.: `nomic-embed-text`).
- Auto-apply real no LinkedIn na v1 ou apenas assistido.

## Como reproduzir

1. Seguir o roadmap fase a fase; consultar Context7 antes de cada fase.
2. Manter score, hash, idioma, senioridade e salário determinísticos, com testes Vitest.
3. Atualizar os diagramas FigJam quando o pipeline ou o schema mudarem.
