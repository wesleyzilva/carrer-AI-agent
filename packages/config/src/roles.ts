export type RoleCluster =
  | "technology"
  | "program"
  | "agile"
  | "product"
  | "data"
  | "cloud"
  | "observability";

export interface RoleClusterConfig {
  id: RoleCluster;
  label: string;
  /** Títulos-alvo (lowercase). Casamento por inclusão no título normalizado. */
  titles: string[];
  /** Peso relativo do cluster dentro do componente "cargo" do score (0–100). */
  fit: number;
}

export const ROLE_CLUSTERS: RoleClusterConfig[] = [
  {
    id: "program",
    label: "Program Management",
    fit: 100,
    titles: [
      "technical program manager",
      "tpm",
      "program manager",
      "gerente de programas",
      "gerente de programa",
      "technical project manager",
      "gerente de projetos",
      "project manager",
      "delivery manager",
      "gerente de delivery",
      "transformation manager",
      "pmo manager",
      "pmo",
    ],
  },
  {
    id: "technology",
    label: "Technology Leadership",
    fit: 100,
    titles: [
      "technology manager",
      "gerente de tecnologia",
      "coordenador de tecnologia",
      "coordenadora de tecnologia",
      "technology coordinator",
      "engineering manager",
      "gerente de engenharia",
      "software engineering manager",
      "it manager",
      "gerente de ti",
      "platform manager",
      "head of technology",
      "head de tecnologia",
      "technology lead",
    ],
  },
  {
    id: "agile",
    label: "Agile Leadership",
    fit: 95,
    titles: [
      "scrum master",
      "agile coach",
      "agile delivery manager",
      "release train engineer",
      "rte",
      "agile program manager",
      "agile transformation lead",
      "agilista",
    ],
  },
  {
    id: "product",
    label: "Product Leadership",
    fit: 90,
    titles: [
      "technical product owner",
      "product owner",
      "technical product manager",
      "product operations manager",
      "product manager",
      "gerente de produto",
      "gerente de produtos",
    ],
  },
  {
    id: "data",
    label: "Data Leadership",
    fit: 90,
    titles: [
      "data platform manager",
      "data analytics manager",
      "data operations manager",
      "data governance manager",
      "analytics manager",
      "gerente de dados",
      "coordenador de dados",
      "head of data",
    ],
  },
  {
    id: "cloud",
    label: "Cloud / Migration Leadership",
    fit: 100,
    titles: [
      "cloud migration lead",
      "cloud program manager",
      "cloud transformation manager",
      "modernization program manager",
      "migration manager",
      "migration lead",
    ],
  },
  {
    id: "observability",
    label: "Observability Leadership",
    fit: 90,
    titles: [
      "observability manager",
      "monitoring manager",
      "sre manager",
      "reliability manager",
      "platform observability lead",
      "head of observability",
    ],
  },
];

/** Palavras que indicam liderança no título (bônus no componente cargo). */
export const LEADERSHIP_TITLE_HINTS = [
  "manager",
  "gerente",
  "coordenador",
  "coordenadora",
  "coordinator",
  "head",
  "lead",
  "director",
  "diretor",
  "principal",
  "staff",
];
