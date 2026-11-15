import type { SiteId } from "@career/config";
import type { PlatformAdapter } from "../types.js";
import { gupyAdapter } from "./gupy.js";
import { linkedinAdapter } from "./linkedin.js";
import { indeedAdapter } from "./indeed.js";
import { glassdoorAdapter } from "./glassdoor.js";

export const ADAPTERS: Record<SiteId, PlatformAdapter> = {
  gupy: gupyAdapter,
  linkedin: linkedinAdapter,
  indeed: indeedAdapter,
  glassdoor: glassdoorAdapter,
};

export function getAdapter(site: string): PlatformAdapter {
  const a = ADAPTERS[site as SiteId];
  if (!a) throw new Error(`site desconhecido: ${site}. Use: ${Object.keys(ADAPTERS).join(", ")}`);
  return a;
}

export { gupyAdapter, linkedinAdapter, indeedAdapter, glassdoorAdapter };
