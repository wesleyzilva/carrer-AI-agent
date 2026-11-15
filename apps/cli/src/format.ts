import type { EnrichedJob } from "@career/core";

export function printTable(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) { console.log("(vazio)"); return; }
  const cols = Object.keys(rows[0]!);
  const width = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)));
  const line = (vals: string[]) => vals.map((v, i) => v.padEnd(width[i]!)).join("  ");
  console.log(line(cols));
  console.log(line(width.map((w) => "-".repeat(w))));
  for (const r of rows) console.log(line(cols.map((c) => String(r[c] ?? ""))));
}

export function printJob(e: EnrichedJob) {
  console.log(`${e.title} @ ${e.companyMatch.name}${e.companyMatch.listed ? " (prioritária)" : ""}`);
  console.log(`score ${e.score} → ${e.decision} · persona ${e.persona}`);
  console.log(`idioma ${e.language} · senioridade ${e.seniority} · modelo ${e.workModel} · indústria ${e.industry} (${e.industryWeight})`);
  console.log(`cargo ${e.roleCluster ?? "-"} (fit ${e.roleFit}) · skills: ${e.skillsMatched.join(", ") || "-"}`);
  if (e.salary.min) console.log(`salário ${e.salary.currency} ${e.salary.min}–${e.salary.max} / ${e.salary.period}`);
  console.log(`breakdown ${Object.entries(e.breakdown).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}
