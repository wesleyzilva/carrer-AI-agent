import { describe, expect, it } from "vitest";
import { openDb, makeRepos } from "@career/db";
import { AnswerEngine } from "./answerEngine.js";
import { guardGeneratedText } from "./guard.js";

describe("guardGeneratedText", () => {
  it("aprova texto fiel ao perfil", () => {
    const r = guardGeneratedText("I have 14 years of experience leading cloud migration programs with Databricks and Datadog.");
    expect(r.ok).toBe(true);
  });
  it("reprova anos inflados e ferramentas fora do perfil", () => {
    const r = guardGeneratedText("With 20 years of experience in Kubernetes and Terraform, I am AWS certified.");
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/20 anos/);
    expect(r.issues.join(" ")).toMatch(/kubernetes/);
    expect(r.issues.join(" ")).toMatch(/certifica/);
  });
  it("reprova placeholder", () => {
    expect(guardGeneratedText("Dear [Company], ...").ok).toBe(false);
  });
});

describe("AnswerEngine (sem IA)", () => {
  const repos = makeRepos(openDb(":memory:"));
  const engine = new AnswerEngine(repos, { allowLlm: false });
  const ctx = { title: "TPM", company: "Stripe", language: "en" as const };

  it("responde pelo perfil", async () => {
    const r = await engine.resolve({ label: "How many years of experience do you have?" }, ctx);
    expect(r.resolver).toBe("profile");
    expect(r.answer).toBe("14");
    expect(r.needsReview).toBe(false);
  });

  it("marca salário como sensível", async () => {
    const r = await engine.resolve({ label: "Salary expectation" }, ctx);
    expect(r.needsReview).toBe(true);
  });

  it("ajusta resposta às opções", async () => {
    const r = await engine.resolve({ label: "Are you willing to relocate?", type: "radio", options: ["Yes", "No"] }, ctx);
    expect(r.answer).toBe("No");
  });

  it("usa o banco de respostas depois de aprovar", async () => {
    const q = "Why do you want to work here?";
    const first = await engine.resolve({ label: q, type: "textarea" }, ctx);
    expect(first.resolver).toBe("human");
    engine.approveHuman(q, "Because of the payments mission.", "en");
    const second = await engine.resolve({ label: q, type: "textarea" }, ctx);
    expect(second.resolver).toBe("bank");
    expect(second.needsReview).toBe(false);
  });
});
