import type { Page } from "playwright";
import { join } from "node:path";
import type { BlockReason, Repos, RunEventStatus, RunOutcome } from "@career/db";
import { log } from "@career/logger";
import { screenshotDir } from "./session.js";

/**
 * Timeline de uma execução. Grava só marcos (ok), bloqueios, esperas por humano e erros.
 * Bloqueios e erros tiram screenshot automaticamente.
 */
export class Recorder {
  readonly runId: number;
  private finished = false;

  constructor(private readonly repos: Repos, readonly site: string, readonly action: string, readonly mode: string, jobId?: number) {
    this.runId = repos.startRun({ site, action, mode, jobId }).id;
    log.info({ action: `run.start`, site, op: action, mode, runId: this.runId });
  }

  mark(step: string, detail?: string, url?: string) {
    this.repos.addRunEvent(this.runId, { step, status: "ok", detail, url });
  }

  skip(step: string, detail?: string) {
    this.repos.addRunEvent(this.runId, { step, status: "skipped", detail });
  }

  async blocked(page: Page | null, reason: BlockReason, step: string, detail?: string) {
    const shot = await this.shot(page, `${step}-blocked`);
    this.repos.addRunEvent(this.runId, { step, status: "blocked", detail: detail ?? reason, screenshotPath: shot, url: page?.url() });
    log.warn({ action: "run.blocked", site: this.site, op: this.action, runId: this.runId, reason, step });
  }

  async waitingHuman(page: Page | null, step: string, detail: string) {
    const shot = await this.shot(page, `${step}-waiting`);
    this.repos.addRunEvent(this.runId, { step, status: "waiting_human", detail, screenshotPath: shot, url: page?.url() });
    log.warn({ action: "run.waiting_human", site: this.site, op: this.action, runId: this.runId, step, detail });
  }

  async error(page: Page | null, step: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const shot = await this.shot(page, `${step}-error`);
    this.repos.addRunEvent(this.runId, { step, status: "error", detail: msg.slice(0, 500), screenshotPath: shot, url: page?.url() });
    log.error({ action: "run.error", site: this.site, op: this.action, runId: this.runId, step, error: msg });
  }

  finish(outcome: RunOutcome, extra: { blockReason?: BlockReason | undefined; error?: string | undefined; summary?: Record<string, unknown> | undefined } = {}) {
    if (this.finished) return;
    this.finished = true;
    this.repos.finishRun(this.runId, { outcome, ...extra });
    log.info({ action: "run.finish", site: this.site, op: this.action, runId: this.runId, outcome, reason: extra.blockReason });
  }

  private async shot(page: Page | null, label: string): Promise<string | undefined> {
    if (!page) return undefined;
    try {
      const file = join(screenshotDir(), `run${this.runId}-${label}-${Date.now()}.png`);
      await page.screenshot({ path: file, fullPage: false });
      return file;
    } catch {
      return undefined;
    }
  }
}
