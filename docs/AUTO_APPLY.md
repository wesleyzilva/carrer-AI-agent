# Cadastro Automatizado de Vagas (IA local)

Objetivo: preencher e enviar candidaturas com o mínimo de esforço manual, usando regras + banco de respostas + Ollama, nos **top 3 sites do Brasil** e **top 3 do mundo**.

## Sites do escopo inicial (rascunho; confirmar tráfego no Similarweb)

| Região | # | Site | Fluxo de candidatura | Adaptador |
|---|---|---|---|---|
| BR | 1 | LinkedIn | Easy Apply (modal multi-etapas) ou redirecionamento ao ATS | `linkedin` |
| BR | 2 | Indeed BR | Indeed Apply ou redirecionamento ao ATS | `indeed` |
| BR | 3 | Gupy | Portais `*.gupy.io` por empresa, conta única, etapas | `gupy` |
| Mundo | 1 | Indeed | Indeed Apply ou ATS externo | `indeed` |
| Mundo | 2 | LinkedIn | Easy Apply ou ATS externo | `linkedin` |
| Mundo | 3 | Glassdoor | Quase sempre redireciona ao ATS do empregador ou ao Indeed Apply | `glassdoor` |

LinkedIn e Indeed servem às duas regiões (mesmo adaptador, filtros de país diferentes), então são 4 adaptadores de site. Vagas que redirecionam a ATS externo vão para adaptadores genéricos: Greenhouse, Lever, Ashby, Workable (fase seguinte, o maior ganho para P0 internacional).

## Modos de operação

| Modo | Comportamento | Quando |
|---|---|---|
| `DRY_RUN` | Preenche, tira screenshot, **não envia** | Padrão em site/ATS novo |
| `ASSISTED` | Preenche tudo e espera o clique humano em Enviar | Padrão para score 70–84 e para LinkedIn |
| `AUTO` | Envia sozinho | Só score >= 85, confiança total >= limiar, limites diários respeitados |

Cada adaptador começa em `DRY_RUN`, sobe para `ASSISTED` após validação manual e só então `AUTO`. Isso é configurável por site em `packages/config/src/sources.ts`.

> **Risco de ToS**: LinkedIn, Indeed e Glassdoor restringem automação. Por isso o padrão conservador (`ASSISTED`), limites baixos e o comportamento humano abaixo. O risco para a conta é seu; o modo `AUTO` deve ser ativado de forma consciente.

## Fluxo de uma candidatura

1. **Elegibilidade**: vaga com `decision = AUTO_APPLY` (>=85) ou aprovada manualmente em REVIEW.
2. **Pré-checagem** (determinística): hash de candidatura, empresa (cooldown), URL, vaga ainda aberta, limite diário e janela de horário.
3. **Persona + currículo**: persona escolhida por regra; versão de CV da persona; idioma da vaga.
4. **Abrir o formulário** (Playwright, sessão persistente, comportamento humano).
5. **Extrair campos**: pela árvore de acessibilidade (label, tipo, opções, obrigatório).
6. **Resolver cada campo** (ver abaixo).
7. **Validar**: campos obrigatórios completos, nenhum campo abaixo do limiar de confiança, respostas conferidas contra o perfil.
8. **Evidência**: screenshot antes do envio e respostas salvas.
9. **Enviar** (`AUTO`) ou **aguardar humano** (`ASSISTED`).
10. **Registrar**: status `APPLIED`, evento JSON, métricas por fonte.

## Resolução de campos (rules-first)

Ordem; cada etapa só roda se a anterior não resolver:

1. **Mapa de perfil** (determinístico): nome, e-mail, telefone, cidade, LinkedIn/GitHub, anos de experiência por skill, nível de inglês, autorização de trabalho, disponibilidade, pretensão salarial por moeda (BRL/USD), modelo de trabalho.
2. **Banco de respostas** (`answers` no SQLite + vetores no LanceDB): pergunta normalizada com hash exato; se não houver, similaridade por embeddings locais com limiar (sugestão: cosseno >= 0,88). Respostas aprovadas são reutilizadas sem IA.
3. **Opções (select/radio/checkbox)**: casar a resposta do perfil/banco com as opções por correspondência textual e sinônimos. Só se falhar, o Ollama escolhe entre as opções com saída restrita (JSON com o índice).
4. **Texto livre** (Ollama, `qwen2.5:7b` padrão): geração no idioma da vaga, com RAG do CV e projetos, tamanho respeitando o limite do campo. Resultado entra no banco como `needs_review` até você aprovar; depois vira reutilizável.
5. **Sensível ou desconhecido** → pausa e marca `REVIEW`: pretensão salarial fora do mapa, perguntas jurídicas/visto, dados demográficos, qualquer campo sem confiança.

**Anti-alucinação**: números, empresas, ferramentas e certificações em respostas geradas são conferidos contra o perfil estruturado. Se algo não existe no perfil, a resposta é rejeitada e o campo vai para REVIEW. IA nunca decide salário, score, duplicidade, idioma ou senioridade.

## Segurança e comportamento humano

- Contexto persistente (cookies/sessão em disco), um site por vez, **uma candidatura por vez**.
- Delays com distribuição não uniforme, scroll variável, movimento de cursor, digitação com cadência humana.
- Limites iniciais sugeridos (configuráveis): 8–10 candidaturas/dia no total, 3–8 min entre candidaturas, janela de horário comercial do fuso do site.
- Parada automática e alerta ao detectar captcha, checkpoint ou pedido de login inesperado. Backoff e retomada só manual.
- Nunca: refresh em massa, navegação rápida, ações idênticas repetidas, candidaturas simultâneas.

## Modelo de dados (adições)

- `answers(id, question_norm, question_hash UNIQUE, answer, language, source[profile|bank|llm], status[needs_review|approved], embedding_ref, last_used_at)`
- `application_runs(id, application_id, site, mode, started_at, finished_at, outcome[SUBMITTED|WAITING_HUMAN|REVIEW|FAILED|BLOCKED], screenshot_path, error)`
- `application_fields(id, run_id, label, field_type, answer_id, confidence, resolver[profile|bank|options|llm|human])`
- `job_sources(job_id, site, source_url, seen_at)`: uma vaga, várias fontes.

## Interface do adaptador

```ts
interface ApplyAdapter {
  site: SiteId;
  canHandle(job: Job): boolean;
  open(job: Job, ctx: BrowserContext): Promise<ApplyForm>;   // extrai campos e etapas
  fill(form: ApplyForm, answers: ResolvedAnswers): Promise<void>;
  submit(form: ApplyForm): Promise<SubmitResult>;             // só chamado em AUTO
  detectBlock(page: Page): Promise<BlockReason | null>;       // captcha, checkpoint, login
}
```

Motor de resolução e persistência são compartilhados; cada adaptador cuida só do que é específico do site (seletores, etapas, redirecionamentos).

## Notas por site

- **LinkedIn**: Easy Apply abre modal em etapas; vagas com "Apply" externo viram handoff ao ATS. Mais sensível a automação, começar em `ASSISTED`.
- **Indeed**: Indeed Apply usa perguntas do empregador (screener). Boa parte redireciona ao ATS do empregador.
- **Gupy**: login único, formulários por empresa e etapas (dados, perguntas, testes). Muitas vagas pedem testes/vídeo que ficam fora do automático (`REVIEW`).
- **Glassdoor**: tratar principalmente como fonte de descoberta; a candidatura quase sempre cai no ATS do empregador ou no Indeed Apply.

## Critérios de aceite da primeira entrega

1. `DRY_RUN` completo em Gupy e LinkedIn Easy Apply com screenshot e relatório de campos.
2. Nenhuma candidatura duplicada (teste com a mesma vaga vinda de duas fontes).
3. >= 80% dos campos de uma vaga típica resolvidos sem IA após popular o banco de respostas.
4. Todo campo gerado por IA marcado `needs_review` e rastreável.
5. Logs JSON com os campos do projeto e métricas por site.
