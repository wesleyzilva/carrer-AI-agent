import type { Locator, Page } from "playwright";

/** Distribuição não uniforme (soma de 2 uniformes → triangular) para parecer humano. */
export function jitter(minMs: number, maxMs: number): number {
  const u = (Math.random() + Math.random()) / 2;
  return Math.round(minMs + (maxMs - minMs) * u);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function pause(minMs = 400, maxMs = 1400) {
  await sleep(jitter(minMs, maxMs));
}

/** Digitação com cadência variável, pausas maiores em espaço/pontuação e raro "erro" corrigido. */
export async function humanType(target: Locator, text: string, opts: { clear?: boolean } = {}) {
  await target.click({ delay: jitter(40, 120) });
  await pause(150, 400);
  if (opts.clear) {
    await target.press("ControlOrMeta+a");
    await pause(60, 160);
    await target.press("Backspace");
    await pause(100, 300);
  }
  for (const ch of text) {
    if (Math.random() < 0.015 && /[a-z]/i.test(ch)) {
      const wrong = String.fromCharCode(ch.charCodeAt(0) + (Math.random() < 0.5 ? 1 : -1));
      await target.pressSequentially(wrong, { delay: jitter(60, 140) });
      await pause(120, 300);
      await target.press("Backspace");
      await pause(80, 200);
    }
    await target.pressSequentially(ch, { delay: jitter(45, 140) });
    if (/[\s.,;!?]/.test(ch)) await pause(80, 260);
  }
  await pause(200, 600);
}

/** Scroll em passos irregulares, às vezes voltando um pouco. */
export async function humanScroll(page: Page, totalPx = 800) {
  let done = 0;
  while (done < totalPx) {
    const step = jitter(120, 420);
    await page.mouse.wheel(0, step);
    done += step;
    await pause(120, 450);
    if (Math.random() < 0.15) {
      await page.mouse.wheel(0, -jitter(40, 120));
      await pause(100, 300);
    }
  }
}

/** Move o mouse em curva até o elemento antes de clicar. */
export async function humanClick(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (box) {
    const tx = box.x + box.width * (0.3 + Math.random() * 0.4);
    const ty = box.y + box.height * (0.3 + Math.random() * 0.4);
    const steps = jitter(8, 20);
    await page.mouse.move(tx + jitter(-80, 80), ty + jitter(-60, 60), { steps: Math.floor(steps / 2) });
    await page.mouse.move(tx, ty, { steps });
    await pause(60, 180);
  }
  await target.click({ delay: jitter(40, 130) });
  await pause(300, 900);
}

/** Navegação com espera "de leitura" após carregar. */
export async function humanGoto(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await pause(900, 2200);
  if (Math.random() < 0.6) await humanScroll(page, jitter(200, 600));
}
