export type IndustryId =
  | "cybersecurity"
  | "payments"
  | "fintech"
  | "cloud_migration"
  | "data_migration"
  | "observability"
  | "data_platforms"
  | "ai_platforms"
  | "cloud_infrastructure"
  | "platform_engineering"
  | "mainframe_modernization"
  | "crm"
  | "hr_tech"
  | "legal_tech"
  | "logistics_tech"
  | "customer_success"
  | "edtech"
  | "retail_tech"
  | "govtech"
  | "other";

export interface IndustryConfig {
  id: IndustryId;
  label: string;
  weight: number;
  /** Palavras-chave (lowercase) usadas para detectar a indústria em título/descrição/empresa. */
  keywords: string[];
}

export const INDUSTRIES: IndustryConfig[] = [
  { id: "cybersecurity", label: "Cybersecurity", weight: 100, keywords: ["cybersecurity", "cyber security", "security", "segurança da informação", "appsec", "devsecops", "siem", "soc ", "threat", "vulnerability", "pci-dss", "pci dss"] },
  { id: "payments", label: "Payments", weight: 100, keywords: ["payment", "payments", "pagamento", "pagamentos", "acquiring", "adquirência", "pix", "card processing", "checkout", "wallet", "issuing"] },
  { id: "fintech", label: "Fintech", weight: 100, keywords: ["fintech", "banking", "banco digital", "neobank", "lending", "crédito", "credit", "open finance", "bacen", "febraban"] },
  { id: "cloud_migration", label: "Cloud Migration", weight: 100, keywords: ["cloud migration", "migração para nuvem", "migração cloud", "lift and shift", "modernization to cloud", "aws migration", "azure migration"] },
  { id: "data_migration", label: "Data Migration", weight: 100, keywords: ["data migration", "migração de dados", "database migration", "data center migration", "legacy data"] },
  { id: "observability", label: "Observability", weight: 95, keywords: ["observability", "observabilidade", "monitoring", "monitoramento", "sre", "reliability", "datadog", "dynatrace", "grafana", "opentelemetry", "new relic", "splunk"] },
  { id: "data_platforms", label: "Data Platforms", weight: 95, keywords: ["data platform", "plataforma de dados", "data engineering", "engenharia de dados", "lakehouse", "data lake", "databricks", "snowflake", "analytics", "data governance", "dbt"] },
  { id: "ai_platforms", label: "AI Platforms", weight: 95, keywords: ["ai platform", "machine learning", "mlops", "llm", "generative ai", "genai", "agentic", "ai agents", "inteligência artificial"] },
  { id: "cloud_infrastructure", label: "Cloud Infrastructure", weight: 90, keywords: ["cloud infrastructure", "infraestrutura cloud", "kubernetes", "iaas", "paas", "cloud native", "aws", "azure", "gcp"] },
  { id: "platform_engineering", label: "Platform Engineering", weight: 90, keywords: ["platform engineering", "developer platform", "internal developer platform", "devops platform", "platform team"] },
  { id: "mainframe_modernization", label: "Mainframe Modernization", weight: 85, keywords: ["mainframe", "cobol", "legacy modernization", "modernização de legado", "z/os", "as400"] },
  { id: "crm", label: "CRM", weight: 85, keywords: ["crm", "salesforce", "hubspot", "zendesk", "customer relationship"] },
  { id: "hr_tech", label: "HR Tech", weight: 80, keywords: ["hr tech", "hrtech", "human resources", "recursos humanos", "payroll", "folha de pagamento", "people platform", "workday"] },
  { id: "legal_tech", label: "Legal Tech", weight: 80, keywords: ["legal tech", "legaltech", "law firm", "jurídico", "contract management", "e-discovery"] },
  { id: "logistics_tech", label: "Logistics Tech", weight: 80, keywords: ["logistics", "logística", "supply chain", "freight", "transporte", "shipping", "warehouse"] },
  { id: "customer_success", label: "Customer Success Platforms", weight: 80, keywords: ["customer success", "customer experience", "cx platform", "support platform"] },
  { id: "edtech", label: "EdTech", weight: 75, keywords: ["edtech", "education", "educação", "learning platform", "lms"] },
  { id: "retail_tech", label: "Retail Tech", weight: 75, keywords: ["retail", "varejo", "e-commerce", "ecommerce", "marketplace"] },
  { id: "govtech", label: "GovTech", weight: 75, keywords: ["govtech", "government", "governo", "public sector", "setor público"] },
];

export const DEFAULT_INDUSTRY_WEIGHT = 50;

export const INDUSTRY_BY_ID: Record<string, IndustryConfig> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.id, i]),
);
