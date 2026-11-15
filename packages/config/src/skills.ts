export interface SkillConfig {
  /** Nome canônico. */
  name: string;
  /** Variações (lowercase) que aparecem em descrições de vaga. */
  aliases: string[];
  /** Peso relativo da skill (1–3). */
  weight: 1 | 2 | 3;
}

const s = (name: string, weight: 1 | 2 | 3, ...aliases: string[]): SkillConfig => ({
  name,
  aliases: [name.toLowerCase(), ...aliases.map((a) => a.toLowerCase())],
  weight,
});

export const PRIORITY_SKILLS: SkillConfig[] = [
  s("Databricks", 3),
  s("Apache Spark", 2, "spark", "pyspark"),
  s("MLOps", 2),
  s("AWS", 2, "amazon web services"),
  s("Azure", 2, "microsoft azure"),
  s("GCP", 2, "google cloud"),
  s("Cloud Migration", 3, "migração para nuvem", "migração cloud", "cloud transformation"),
  s("Data Migration", 3, "migração de dados"),
  s("Mainframe Modernization", 3, "mainframe", "modernização de legado", "legacy modernization"),
  s("DevSecOps", 3, "devops", "secure sdlc"),
  s("Veracode", 2),
  s("Rapid7", 2),
  s("Wiz", 2),
  s("Checkmarx", 2),
  s("Datadog", 3),
  s("Dynatrace", 2),
  s("Grafana", 2),
  s("OpenTelemetry", 2, "otel"),
  s("Product Analytics", 2, "analytics de produto"),
  s("Amplitude", 2),
  s("Payment Platforms", 3, "payments", "pagamentos", "payment platform", "acquiring", "pix"),
  s("PCI-DSS", 2, "pci dss", "pci"),
  s("LGPD", 1),
  s("BACEN", 1, "banco central"),
  s("FEBRABAN", 1),
  s("Agile", 2, "ágil", "agile methodologies", "metodologias ágeis"),
  s("Scrum", 2),
  s("Kanban", 1),
  s("SAFe", 2, "scaled agile"),
  s("PI Planning", 2),
  s("Product Ownership", 2, "product owner", "backlog"),
  s("AI", 2, "artificial intelligence", "inteligência artificial"),
  s("Agentic AI", 3, "ai agents", "agentes de ia", "agentic"),
  s("LLM", 2, "large language model", "genai", "generative ai"),
  s("GitHub Copilot", 1, "copilot"),
  s("Claude", 1, "anthropic"),
  s("MCP", 2, "model context protocol"),
  s("Program Management", 3, "gestão de programas", "technical program management"),
  s("Stakeholder Management", 2, "gestão de stakeholders"),
  s("Cybersecurity", 3, "cyber security", "segurança da informação", "information security"),
  s("Observability", 3, "observabilidade", "monitoring", "monitoramento"),
  s("CRM", 2, "salesforce", "hubspot"),
];
