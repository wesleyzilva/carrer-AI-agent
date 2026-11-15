# Navegador: login, cadastro, sincronização de perfil e timeline

Pacote `@career/browser`. Cobre as 4 plataformas do escopo (Gupy, LinkedIn, Indeed, Glassdoor) com a mesma interface `PlatformAdapter`: `isLoggedIn`, `login`, `signup`, `syncProfile`.

## Setup

```bash
pnpm browsers:install          # baixa o Chromium do Playwright (uma vez)
copy .env.example .env         # preencha PROFILE_* e CRED_*
pnpm career profile --lang pt  # confere o perfil canônico que será sincronizado
```

`BROWSER_CHANNEL=chrome` no `.env` usa o Chrome já instalado (perfil separado do seu pessoal).

## Sessão persistente

Um perfil de navegador por site em `data/browser-profile/<site>` (gitignored). Cookies e login ficam salvos: depois do primeiro login (que pode ser manual), o agente só reutiliza. Nunca compartilhe essa pasta.

## Comandos

```bash
# Login (abre janela; com --wait mantém aberta se pedir OTP/captcha)
pnpm career login gupy
pnpm career login linkedin

# Cadastro do zero. DRY_RUN só preenche e tira screenshot; ASSISTED envia e para na verificação humana
pnpm career signup gupy --mode DRY_RUN
pnpm career signup gupy --mode ASSISTED --lang pt

# Corrigir dados já cadastrados: DRY_RUN mostra o diff; ASSISTED/AUTO aplica (limitado por sources.ts)
pnpm career profile-sync linkedin                      # só diff
pnpm career profile-sync gupy --mode ASSISTED --lang pt
pnpm career profile-sync linkedin --mode ASSISTED --persona agentic_tpm

# Timeline
pnpm career timeline          # resumo por site: ok / blocked / waiting / failed, último bloqueio, último erro
pnpm career runs --outcome BLOCKED
pnpm career timeline 12       # marcos da execução #12, com 📷 onde há screenshot
```

## Timeline (o que é e o que não é)

Não é log de tudo. Cada execução vira uma linha em `runs` com `outcome`:

| outcome | significado |
|---|---|
| `OK` | terminou sem bloqueio |
| `BLOCKED` | captcha, checkpoint, rate limit ou seletor ausente; screenshot salvo |
| `WAITING_HUMAN` | precisa de você: OTP, confirmação de e-mail, login manual, verificação |
| `FAILED` | exceção; mensagem em `error` e screenshot |

Em `run_events` entram só marcos (`navigate:login`, `login`, `profile:read`, `field:headline`), pulos (`skipped`, ex.: DRY_RUN), bloqueios e erros. `block_reason` possíveis: `captcha`, `otp`, `checkpoint`, `login_required`, `rate_limit`, `selector_missing`.

Screenshots em `data/screenshots/run<id>-<step>-<ts>.png`.

## Perfil canônico

`buildCanonicalProfile(persona, lang)` monta o que deve estar igual em todas as plataformas: nome, contato (`.env`), cidade, headline e "sobre" por persona, anos de experiência, inglês, skills. `PROFILE_HEADLINE` e `PROFILE_ABOUT` no `.env` sobrescrevem o texto gerado.

`profile-sync` lê o valor atual de cada campo, compara ignorando espaços e caixa, e só escreve o que divergir. Em `DRY_RUN` registra o diff na timeline sem tocar na página.

## Modos e limites

`effectiveMode()` nunca sobe acima do `applyMode` do site em `packages/config/src/sources.ts`. Hoje: LinkedIn até `ASSISTED`; Gupy, Indeed e Glassdoor em `DRY_RUN`. Suba o máximo do site só depois de validar uma execução em DRY_RUN.

Cadastro (`signup`) nunca é `AUTO`: termina sempre em `WAITING_HUMAN` porque todas as plataformas exigem verificação por e-mail/SMS/captcha.

## Comportamento humano (`human.ts`)

Delays com distribuição triangular, digitação com cadência variável e erro ocasional corrigido, scroll irregular com retorno, mouse em curva antes do clique, viewport e user-agent variados, `navigator.webdriver` removido. Uma ação por vez, um site por vez.

## Seletores: validar na primeira execução

Os seletores dos adaptadores são best-effort e vão mudar. Quando um campo não é encontrado, a execução termina em `BLOCKED (selector_missing)` com screenshot, sem tentar adivinhar. Fluxo recomendado:

1. `pnpm career login <site>` com janela aberta.
2. Se bloquear, `pnpm career timeline <id>` e abra o screenshot.
3. Ajuste os seletores em `packages/browser/src/adapters/<site>.ts` (prefira `getByLabel`/`aria-label`/`name`).
4. Repita em `DRY_RUN` até o diff do `profile-sync` fazer sentido; só então `ASSISTED`.

## Riscos

LinkedIn, Indeed e Glassdoor restringem automação nos termos de uso. Os limites, o modo conservador e o comportamento humano reduzem, mas não eliminam, o risco para a conta. Prefira sessão persistente com login manual no LinkedIn.
