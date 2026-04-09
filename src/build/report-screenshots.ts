import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { applyIgnoreList, loadIgnoreList } from "./ignore-list.js";
import { normalizeRecords } from "./normalize.js";
import { loadSourceRecords } from "./sources.js";

const CACHE_DIR = ".cache/screenshots";

async function loadCachedSlugs(): Promise<Set<string>> {
  try {
    const entries = await readdir(CACHE_DIR, { withFileTypes: true });
    return new Set(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
        .map((entry) => entry.name.replace(/\.png$/, ""))
    );
  } catch {
    return new Set();
  }
}

async function run(): Promise<void> {
  const ignoreList = await loadIgnoreList();
  const sourceRecords = await loadSourceRecords();
  const apis = applyIgnoreList(normalizeRecords(sourceRecords), ignoreList);
  const cachedSlugs = await loadCachedSlugs();

  const withRealScreenshot = apis.filter((api) => cachedSlugs.has(api.slug));
  const missing = apis.filter((api) => !cachedSlugs.has(api.slug));
  const coverage = apis.length === 0 ? 0 : Number(((withRealScreenshot.length / apis.length) * 100).toFixed(2));

  console.log(
    JSON.stringify(
      {
        totalApis: apis.length,
        realScreenshots: withRealScreenshot.length,
        placeholders: missing.length,
        coveragePercent: coverage,
        sampleMissing: missing.slice(0, 25).map((api) => ({
          slug: api.slug,
          name: api.name,
          url: api.screenshotTargetUrl
        }))
      },
      null,
      2
    )
  );
}

await run();
