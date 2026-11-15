import type { RoleCluster } from "./roles.js";

export type PersonaId =
  | "agentic_tpm"
  | "technology_manager"
  | "data_observability_manager"
  | "agile_leader"
  | "technical_product_owner";

export interface PersonaConfig {
  id: PersonaId;
  label: string;
  focus: string[];
  /** Clusters de cargo que ativam esta persona. */
  clusters: RoleCluster[];
  /** Skills canônicas que reforçam esta persona. */
  skills: string[];
  /** Resumo usado como contexto nos prompts (PT e EN). */
  summary: { pt: string; en: string };
}

export const PERSONAS: PersonaConfig[] = [
  {
    id: "agentic_tpm",
    label: "Agentic Technical Program Manager",
    focus: ["Programs", "Transformation", "Cloud Migration", "Data Migration"],
    clusters: ["program", "cloud"],
    skills: ["Program Management", "Cloud Migration", "Data Migration", "Mainframe Modernization", "Agentic AI", "MCP", "Stakeholder Management"],
    summary: {
      pt: "TPM com 14+ anos liderando programas de transformação, migração para nuvem e dados em squads internacionais, aplicando IA agêntica para acelerar a entrega.",
      en: "Technical Program Manager with 14+ years leading transformation, cloud and data migration programs across international squads, applying agentic AI to accelerate delivery.",
    },
  },
  {
    id: "technology_manager",
    label: "Technology Manager",
    focus: ["Leadership", "Architecture", "Governance"],
    clusters: ["technology"],
    skills: ["DevSecOps", "Cybersecurity", "AWS", "Azure", "Stakeholder Management"],
    summary: {
      pt: "Gestor de tecnologia com 14+ anos liderando times distribuídos, governança técnica, arquitetura e programas de segurança.",
      en: "Technology manager with 14+ years leading distributed teams, technical governance, architecture and security programs.",
    },
  },
  {
    id: "data_observability_manager",
    label: "Data & Observability Manager",
    focus: ["Databricks", "Datadog", "Analytics"],
    clusters: ["data", "observability"],
    skills: ["Databricks", "Datadog", "Dynatrace", "Grafana", "OpenTelemetry", "Product Analytics", "Amplitude", "Apache Spark"],
    summary: {
      pt: "Líder de dados e observabilidade com experiência em Databricks, Datadog, product analytics e plataformas de dados em escala.",
      en: "Data and observability leader experienced with Databricks, Datadog, product analytics and large-scale data platforms.",
    },
  },
  {
    id: "agile_leader",
    label: "Agile Leader",
    focus: ["Scrum", "SAFe", "PI Planning", "Delivery"],
    clusters: ["agile"],
    skills: ["Agile", "Scrum", "SAFe", "PI Planning", "Kanban"],
    summary: {
      pt: "Líder ágil com experiência em Scrum, SAFe e PI Planning, conduzindo entregas de squads internacionais.",
      en: "Agile leader experienced in Scrum, SAFe and PI Planning, driving delivery across international squads.",
    },
  },
  {
    id: "technical_product_owner",
    label: "Technical Product Owner",
    focus: ["Product", "Discovery", "Roadmaps"],
    clusters: ["product"],
    skills: ["Product Ownership", "Product Analytics", "Amplitude", "Payment Platforms", "CRM"],
    summary: {
      pt: "Technical Product Owner com foco em discovery, roadmaps e produtos de pagamentos e CRM apoiados por product analytics.",
      en: "Technical Product Owner focused on discovery, roadmaps and payments/CRM products backed by product analytics.",
    },
  },
];

export const DEFAULT_PERSONA: PersonaId = "agentic_tpm";
