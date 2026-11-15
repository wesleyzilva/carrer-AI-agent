import { describe, expect, it } from "vitest";
import { makeRepos, openDb } from "@career/db";
import { buildCanonicalProfile, sameValue } from "./canonicalProfile.js";
import { getCredentials, maskEmail } from "./credentials.js";
import { jitter } from "./human.js";
import { effectiveMode } from "./actions.js";
import { Recorder } from "./recorder.js";
import { getAdapter } from "./adapters/index.js";

describe("credentials", () => {
  it("lê por site com fallback default e mascara", () => {
    process.env["CRED_DEFAULT_EMAIL"] = "wesley@example.com";
    process.env["CRED_DEFAULT_PASSWORD"] = "x";
    expect(getCredentials("gupy")?.email).toBe("wesley@example.com");
    process.env["CRED_GUPY_EMAIL"] = "gupy@example.com";
    process.env["CRED_GUPY_PASSWORD"] = "y";
    expect(getCredentials("gupy")?.email).toBe("gupy@example.com");
    expect(maskEmail("wesley@example.com")).toBe("we***@example.com");
  });
});

describe("canonical profile", () => {
  it("monta headline/about por persona e idioma", () => {
    const pt = buildCanonicalProfile({ persona: "agile_leader", lang: "pt" });
    expect(pt.headline).toMatch(/Agile Leader/);
    expect(pt.country).toBe("Brasil");
    expect(pt.yearsOfExperience).toBe("14");
  });
  it("sameValue ignora espaços e caixa", () => {
    expect(sameValue("  TPM  Lead ", "tpm lead")).toBe(true);
    expect(sameValue("a", "b")).toBe(false);
  });
});

describe("human jitter", () => {
  it("fica dentro do intervalo", () => {
    for (let i = 0; i < 200; i++) {
      const v = jitter(100, 300);
      expect(v).toBeGreaterThanOrEqual(100);
      expect(v).toBeLessThanOrEqual(300);
    }
  });
});

describe("effectiveMode", () => {
  it("nunca ultrapassa o máximo do site", () => {
    expect(effectiveMode("gupy", "AUTO")).toBe("DRY_RUN");
    expect(effectiveMode("linkedin", "AUTO")).toBe("ASSISTED");
    expect(effectiveMode("linkedin", "DRY_RUN")).toBe("DRY_RUN");
  });
});

describe("Recorder / timeline", () => {
  it("registra marcos, bloqueio e resumo por site", async () => {
    const repos = makeRepos(openDb(":memory:"));
    const rec = new Recorder(repos, "gupy", "login", "DRY_RUN");
    rec.mark("navigate:login");
    await rec.blocked(null, "captcha", "login:after-submit");
    rec.finish("BLOCKED", { blockReason: "captcha" });

    const { run, events } = repos.getRunTimeline(rec.runId);
    expect(run?.outcome).toBe("BLOCKED");
    expect(run?.blockReason).toBe("captcha");
    expect(events.map((e) => e.status)).toEqual(["ok", "blocked"]);

    const summary = repos.blockersSummary();
    expect(summary["gupy"]?.blocked).toBe(1);
    expect(summary["gupy"]?.lastBlock).toMatch(/captcha/);
  });
});

describe("adapters", () => {
  it("todos os 4 sites têm adaptador", () => {
    for (const s of ["gupy", "linkedin", "indeed", "glassdoor"]) expect(getAdapter(s).site).toBe(s);
    expect(() => getAdapter("x")).toThrow();
  });
});
