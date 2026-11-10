# CareerAI Agent

Plataforma local-first para descobrir, avaliar e automatizar candidaturas alinhadas ao perfil de Wesley Gomes da Silva. Prioridades: baixo consumo de tokens, processamento local, manutenibilidade.

> Fonte de verdade = este arquivo (mescla dos dois briefs; em conflito, vale o brief 2). Detalhes em `docs/ARCHITECTURE.md` e `docs/ROADMAP.md`.

## Perfil

- Posicionamento: Agentic Technical Program Manager, Technical Product Owner, Technology Manager/Coordinator, Agile Delivery Manager. Complementares: Engineering Manager, Data & Observability Manager.
- 14+ anos. Liderança de squads internacionais, times distribuídos, cross-functional.
- Forças: Global Delivery, Agile, TPM, Cybersecurity, Cloud/Data Migration, Databricks, DevSecOps, Observability, Payments, CRM, Mainframe Modernization, AI-Driven Delivery, Stakeholder Mgmt.
- Domínios: Payments, HR, Legal Tech, Cybersecurity, CRM, Billing, Mainframe, Cloud, Data Platforms, Customer Success, AI Products.

## Prioridades

- **P0**: empresas internacionais, remoto, USD, times globais, cargos de liderança.
- **P1**: empresas brasileiras (Coordenador, Gerente, Program/Agile/Tech Leadership) e cargos-alvo de liderança em tecnologia, TPM, TPO, Agile e Data.

## Clusters de cargos

- **Tecnologia**: Technology/Engineering/Software Engineering/IT/Platform Manager, Head of Technology, Technology Lead.
- **Programas**: TPM, Program Manager, Technical Project Manager, Project Manager, Delivery Manager, Transformation Manager, PMO Manager.
- **Agile**: Scrum Master, Senior SM, Agile Coach, Agile Delivery Manager, RTE, Agile Program Manager, Agile Transformation Lead.
- **Produto**: Technical PO, PO, Technical PM, Product Ops Manager, Product Manager.
- **Dados**: Data Platform/Analytics/Operations/Governance Manager, Analytics Manager.
- **Cloud/Migração**: Cloud Migration Lead, Cloud Program Manager, Cloud Transformation Manager, Modernization Program Manager, Migration Manager.
- **Observability**: Observability/Monitoring/SRE/Reliability Manager, Platform Observability Lead.

## Pesos de indústria

| Peso | Indústrias |
|---|---|
| 100 | Cybersecurity, Payments, Fintech, Cloud Migration, Data Migration |
| 95 | Observability, Data Platforms, AI Platforms |
| 90 | Cloud Infrastructure, Platform Engineering |
| 85 | Mainframe Modernization, CRM |
| 80 | HR Tech, Legal Tech, Logistics Tech, Customer Success Platforms |
| 75 | EdTech, Retail Tech, GovTech |

## Empresas prioritárias

- **Cybersecurity**: CrowdStrike, Palo Alto Networks, Wiz, Veracode, Rapid7, Checkmarx, Snyk, SentinelOne, Zscaler, Cloudflare
- **Payments**: Stripe, Adyen, Checkout.com, Fiserv, FIS, Worldpay, Wise, Mastercard, Visa, Payoneer
- **Observability**: Datadog, New Relic, Dynatrace, Grafana Labs, Elastic, Splunk
- **Data**: Databricks, Snowflake, Confluent, dbt Labs, Fivetran, Starburst
- **Cloud**: AWS, Microsoft, Google, IBM, Kyndryl
- **HR Tech**: Deel, Remote, Rippling, BambooHR, Gusto, Workday
- **CRM**: Salesforce, HubSpot, Zendesk, Freshworks, Zoho
- **Legal Tech**: Clio, Ironclad, Relativity, LexisNexis, Thomson Reuters
- **Mainframe**: IBM, Kyndryl, Rocket Software, BMC, Broadcom, DXC, Ensono
- **Logistics**: Expresso São Miguel, JSL, Tegma, FedEx, DHL, Flexport, Uber Freight

## Skills priorizadas no discovery

Databricks, Spark, MLOps, AWS/Azure/GCP, Cloud/Data Migration, Mainframe Modernization, DevSecOps, Veracode, Rapid7, Wiz, Checkmarx, Datadog, Dynatrace, Grafana, OpenTelemetry, Product Analytics, Amplitude, Payment Platforms, PCI-DSS, LGPD, BACEN, FEBRABAN, Agile/Scrum/Kanban/SAFe/PI Planning, Product Ownership, AI, Agentic AI, LLM, GitHub Copilot, Claude, MCP.

## Modelo de trabalho (ajusta score, nunca rejeita)

Remote USD = 100 · Remote BR = 90 · Hybrid = 70 · Onsite = 40.

## Decisão por score

- `>= 85` AUTO_APPLY
- `70–84` MANUAL_REVIEW
- `< 70` REJECT

Score é **determinístico** (indústria, empresa, cargo, skills, modelo de trabalho, moeda, senioridade). Nunca via IA.

## Personas (seleção automática)

1. Agentic TPM: programas, transformação, Cloud/Data Migration
2. Technology Manager: liderança, arquitetura, governança
3. Data & Observability Manager: Databricks, Datadog, analytics
4. Agile Leader: Scrum, SAFe, PI Planning, delivery
5. Technical Product Owner: produto, discovery, roadmaps

## Política de IA

Regras primeiro, IA só quando necessário. Ordem de economia: regras → cache → busca local → embeddings locais → Ollama → APIs externas.

- **Permitido**: cover letter, otimização de currículo, simulação de entrevista, respostas livres, career insights.
- **Proibido** (algoritmo determinístico): detecção de salário, cálculo de score, detecção de duplicidade, detecção de idioma, detecção de senioridade.
- Nunca processar a mesma vaga duas vezes.
- Idioma: detectar PT/EN e gerar tudo no idioma da vaga.

## Duplicidade

Nunca aplicar duas vezes. `application_hash = hash(company + title + location + url)` (normalizados). Antes de aplicar, verificar: candidatura existente, empresa, URL da vaga e hash.

Status: `DISCOVERED → REVIEW → APPLIED → INTERVIEW → OFFER | REJECTED`.

## Cadastro automatizado de vagas

Detalhes em `docs/AUTO_APPLY.md`; fontes em `packages/config/src/sources.ts`. Top 3 BR: LinkedIn, Indeed BR, Gupy. Top 3 mundo: Indeed, LinkedIn, Glassdoor.

- Modos por site: `DRY_RUN` → `ASSISTED` → `AUTO` (AUTO só com score >= 85).
- Campos: perfil → banco de respostas → opções → Ollama (texto livre) → humano. IA nunca decide salário, score, duplicidade, idioma ou senioridade.
- Respostas geradas por IA entram como `needs_review`; números e ferramentas citados são conferidos contra o perfil.
- Limites padrão: 10 candidaturas/dia no total, uma por vez, intervalos aleatórios.

## Segurança LinkedIn

Obrigatório: delays aleatórios, scroll aleatório, simulação de cursor e digitação, sessão e cookies persistentes. Usar scans incrementais, cache e monitoramento agendado.
Proibido: refresh em massa, navegação rápida, scraping agressivo, ações idênticas repetidas, atualizações em massa, loops agressivos, múltiplas candidaturas simultâneas.

## Stack

Node.js 22+, TypeScript, pnpm · Next.js 15+ (App Router, Tailwind, shadcn/ui) · Playwright · MCP · SQLite + Drizzle · LanceDB · Ollama (`qwen2.5:7b`, `llama3.1:8b`, `mistral:7b`) · Vitest.

Brief 2 cita Prisma, LangChain e LangGraph para validação; ORM oficial é **Drizzle**. Só adotar os outros se houver ganho claro.

## Context7

Consultar antes de implementar: Next.js, Playwright, MCP, TypeScript, Ollama, LanceDB, OpenTelemetry, Drizzle (+ Prisma/LangChain/LangGraph se avaliados).
Prioridade: 1) código do projeto, 2) Context7, 3) docs oficiais, 4) componentes existentes, 5) raciocínio do LLM.

## Logging

JSON estruturado: `timestamp, company, role, country, salary, score, language, persona, action, duration, error`.

## Dashboard (Next.js)

Vagas descobertas/pontuadas/aplicadas, entrevistas, ofertas, rejeições, top indústrias, top empresas, tendências de salário e de cargos, funil de conversão.

## Visão de longo prazo

Plataforma de inteligência de carreira que descobre vagas e empresas, identifica tendências, adapta currículo, prepara entrevistas e automatiza candidaturas, maximizando oportunidades internacionais, operando localmente com mínimo de tokens.
