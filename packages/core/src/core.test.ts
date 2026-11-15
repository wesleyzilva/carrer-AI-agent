import { describe, expect, it } from "vitest";
import {
  applicationHash,
  computeScore,
  decide,
  detectLanguage,
  detectSeniority,
  detectWorkModel,
  enrichJob,
  jobIdentityHash,
  matchCompany,
  matchRole,
  matchSkills,
  normalizeUrl,
  parseSalary,
  selectPersona,
} from "./index.js";

describe("normalizeUrl", () => {
  it("remove tracking, fragmento e www", () => {
    expect(normalizeUrl("https://www.linkedin.com/jobs/view/123/?trk=abc&utm_source=x#top")).toBe(
      "https://linkedin.com/jobs/view/123",
    );
  });
});

describe("hashes", () => {
  it("mesma vaga em fontes diferentes gera o mesmo identity hash", () => {
    const a = jobIdentityHash("Stripe, Inc.", "Technical Program Manager (Remote)", "São Paulo, Brazil");
    const b = jobIdentityHash("stripe", "technical program manager", "sao paulo brazil");
    expect(a).toBe(b);
  });
  it("application hash muda com a URL", () => {
    const a = applicationHash("Stripe", "TPM", "Remote", "https://a.com/1");
    const b = applicationHash("Stripe", "TPM", "Remote", "https://a.com/2");
    expect(a).not.toBe(b);
  });
});

describe("detectLanguage", () => {
  it("pt", () => {
    expect(detectLanguage("Gerente de Tecnologia", "Buscamos profissional com experiência em liderança de equipes e projetos de migração para nuvem.")).toBe("pt");
  });
  it("en", () => {
    expect(detectLanguage("Technical Program Manager", "We are looking for an experienced TPM to lead our cloud migration programs across the globe.")).toBe("en");
  });
  it("unknown para texto curto", () => {
    expect(detectLanguage("TPM")).toBe("unknown");
  });
});

describe("detectSeniority", () => {
  it.each([
    ["Senior Scrum Master", "senior"],
    ["Gerente de Tecnologia", "manager"],
    ["Head of Data", "director"],
    ["Tech Lead", "lead"],
    ["Analista Pleno", "mid"],
    ["Estagiário de TI", "junior"],
    ["Product Owner", "unknown"],
  ])("%s → %s", (title, expected) => {
    expect(detectSeniority(title)).toBe(expected);
  });
});

describe("parseSalary", () => {
  it("BRL mensal", () => {
    const s = parseSalary("R$ 15.000 a R$ 20.000 por mês");
    expect(s).toEqual({ min: 15000, max: 20000, currency: "BRL", period: "month" });
  });
  it("USD anual com k", () => {
    const s = parseSalary("$120k – $150k USD per year");
    expect(s.min).toBe(120000);
    expect(s.max).toBe(150000);
    expect(s.currency).toBe("USD");
    expect(s.period).toBe("year");
  });
  it("US format com vírgula de milhar", () => {
    const s = parseSalary("USD 110,000 - 140,000");
    expect(s.min).toBe(110000);
    expect(s.max).toBe(140000);
  });
  it("vazio", () => {
    expect(parseSalary(undefined).currency).toBe("unknown");
  });
});

describe("detectWorkModel", () => {
  it("remoto em USD", () => {
    expect(detectWorkModel({ title: "TPM (Remote)", currency: "USD", companyInternational: true })).toBe("remote_usd");
  });
  it("remoto BR", () => {
    expect(detectWorkModel({ location: "São Paulo - Remoto", currency: "BRL", companyInternational: false })).toBe("remote_br");
  });
  it("remoto sem moeda com 'Brazil' na localização → remote_br mesmo em empresa internacional", () => {
    expect(detectWorkModel({ location: "Remote - Brazil", currency: "unknown", companyInternational: true })).toBe("remote_br");
  });
  it("híbrido vence descrição remota", () => {
    expect(detectWorkModel({ location: "São Paulo (Híbrido)", description: "trabalho remoto 2x", currency: "unknown", companyInternational: false })).toBe("hybrid");
  });
  it("presencial", () => {
    expect(detectWorkModel({ hint: "Presencial", currency: "unknown", companyInternational: false })).toBe("onsite");
  });
});

describe("matchCompany", () => {
  it("empresa listada por alias", () => {
    const m = matchCompany("Palo Alto");
    expect(m.listed).toBe(true);
    expect(m.name).toBe("Palo Alto Networks");
  });
  it("empresa brasileira não listada", () => {
    const m = matchCompany("Acme Serviços Ltda", "São Paulo, Brasil");
    expect(m.listed).toBe(false);
    expect(m.international).toBe(false);
  });
});

describe("matchRole", () => {
  it("TPM → program", () => {
    expect(matchRole("Senior Technical Program Manager").cluster).toBe("program");
  });
  it("Coordenador de Tecnologia → technology", () => {
    expect(matchRole("Coordenador de Tecnologia").cluster).toBe("technology");
  });
  it("IC sem cluster tem fit baixo", () => {
    const r = matchRole("Backend Developer");
    expect(r.cluster).toBeNull();
    expect(r.fit).toBeLessThan(30);
  });
});

describe("matchSkills", () => {
  it("casa aliases com fronteira de palavra", () => {
    const m = matchSkills("Experience with Databricks, Datadog and PCI-DSS. Not Sparkle.");
    expect(m.matched).toContain("Databricks");
    expect(m.matched).toContain("Datadog");
    expect(m.matched).toContain("PCI-DSS");
    expect(m.matched).not.toContain("Apache Spark");
  });
});

describe("score & decision", () => {
  it("thresholds", () => {
    expect(decide(85)).toBe("AUTO_APPLY");
    expect(decide(84)).toBe("MANUAL_REVIEW");
    expect(decide(70)).toBe("MANUAL_REVIEW");
    expect(decide(69)).toBe("REJECT");
  });
  it("vaga perfeita chega perto de 100", () => {
    const { score } = computeScore({
      industryWeight: 100, companyListed: true, companyInternational: true, roleFit: 100,
      seniority: "manager", skillsCoverage: 100, workModel: "remote_usd", currencyIsUsd: true,
    });
    expect(score).toBe(100);
  });
  it("onsite nunca rejeita sozinho", () => {
    const { score } = computeScore({
      industryWeight: 100, companyListed: true, companyInternational: true, roleFit: 100,
      seniority: "manager", skillsCoverage: 100, workModel: "onsite", currencyIsUsd: true,
    });
    expect(decide(score)).toBe("AUTO_APPLY");
  });
});

describe("selectPersona", () => {
  it("data cluster + Databricks → data_observability_manager", () => {
    expect(selectPersona("data", ["Databricks", "Datadog"])).toBe("data_observability_manager");
  });
  it("sem sinal → default", () => {
    expect(selectPersona(null, [])).toBe("agentic_tpm");
  });
});

describe("enrichJob (end-to-end)", () => {
  it("vaga P0 ideal → AUTO_APPLY", () => {
    const job = enrichJob({
      title: "Technical Program Manager, Cloud Migration (Remote)",
      company: "Datadog",
      url: "https://careers.datadoghq.com/detail/123",
      location: "Remote - Americas",
      salaryText: "$150,000 - $180,000 USD per year",
      description: "Lead cloud migration and data migration programs. Experience with Datadog, OpenTelemetry, AWS, Agile and SAFe. Strong stakeholder management.",
    });
    expect(job.language).toBe("en");
    expect(job.workModel).toBe("remote_usd");
    expect(job.industry).toBe("observability");
    expect(job.roleCluster).toBe("program");
    expect(job.decision).toBe("AUTO_APPLY");
    expect(job.persona).toBe("agentic_tpm");
  });

  it("vaga IC presencial de outra indústria → REJECT", () => {
    const job = enrichJob({
      title: "Desenvolvedor Java Júnior",
      company: "Loja XYZ Ltda",
      url: "https://vagas.com.br/v1",
      location: "Curitiba, PR - Presencial",
      description: "Vaga para desenvolvedor júnior em e-commerce. Conhecimento em Java e SQL.",
    });
    expect(job.language).toBe("pt");
    expect(job.decision).toBe("REJECT");
  });
});
