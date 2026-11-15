import { describe, expect, it } from "vitest";
import { enrichJob } from "@career/core";
import { makeRepos, openDb } from "./index.js";

const sample = (url: string, source = "linkedin") =>
  enrichJob({
    title: "Technical Program Manager",
    company: "Stripe",
    url,
    location: "Remote - US",
    salaryText: "$150k - $180k USD",
    description: "Lead payments programs with Agile and stakeholder management.",
    source,
  });

describe("repos", () => {
  it("não processa a mesma vaga duas vezes (URL e hash)", () => {
    const repos = makeRepos(openDb(":memory:"));
    const a = repos.upsertJob(sample("https://stripe.com/jobs/1?utm_source=li"));
    expect(a.created).toBe(true);

    const b = repos.upsertJob(sample("https://www.stripe.com/jobs/1"));
    expect(b.created).toBe(false);
    expect(b.job.id).toBe(a.job.id);

    const c = repos.upsertJob(sample("https://indeed.com/viewjob?jk=999", "indeed"));
    expect(c.created).toBe(false);
    expect(c.duplicateOfExisting).toBe(true);
    expect(c.job.id).toBe(a.job.id);
  });

  it("nunca aplica duas vezes", () => {
    const repos = makeRepos(openDb(":memory:"));
    const { job } = repos.upsertJob(sample("https://stripe.com/jobs/2"));
    repos.recordApplication(job, { persona: "agentic_tpm", mode: "ASSISTED" });
    const again = repos.getJob(job.id)!;
    expect(again.status).toBe("APPLIED");
    expect(repos.canApply(again).ok).toBe(false);
    expect(() => repos.recordApplication(again, { persona: "agentic_tpm", mode: "ASSISTED" })).toThrow(/Duplicidade/);
  });

  it("cache de IA por input_hash", () => {
    const repos = makeRepos(openDb(":memory:"));
    const v = { jobId: null, kind: "cover_letter", language: "en", persona: "agentic_tpm", model: "qwen2.5:7b", inputHash: "abc", content: "Hello" };
    const first = repos.saveGenerated(v);
    const second = repos.saveGenerated({ ...v, content: "Different" });
    expect(second.id).toBe(first.id);
    expect(second.content).toBe("Hello");
  });
});
