import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

import { chromium, type Browser } from "playwright";

import { applyIgnoreList, loadIgnoreList } from "./ignore-list.js";
import { normalizeRecords } from "./normalize.js";
import { loadSourceRecords } from "./sources.js";
import type { ApiEntry } from "./types.js";

const CACHE_DIR = ".cache/screenshots";
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_STALE_DAYS = 90;
const CLOSE_TIMEOUT_MS = 5_000;
const VIEWPORT = { width: 1440, height: 960 };

interface Options {
  concurrency: number;
  limit: number | null;
  staleDays: number;
  force: boolean;
  slugs: Set<string> | null;
}

interface CaptureResult {
  ok: number;
  skipped: number;
  failed: number;
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (const argument of argv) {
    if (!argument.startsWith("--")) {
      continue;
    }

    const [rawKey, value] = argument.slice(2).split("=", 2);
    const key = rawKey?.trim();
    if (!key) {
      continue;
    }

    if (value === undefined) {
      flags.add(key);
    } else {
      values.set(key, value);
    }
  }

  return {
    concurrency: Math.max(1, Number(values.get("concurrency") ?? DEFAULT_CONCURRENCY)),
    limit: values.has("limit") ? Math.max(1, Number(values.get("limit"))) : null,
    staleDays: Math.max(1, Number(values.get("stale-days") ?? DEFAULT_STALE_DAYS)),
    force: flags.has("force"),
    slugs: values.has("slugs")
      ? new Set(
          values
            .get("slugs")
            ?.split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        )
      : null
  };
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function isStale(path: string, staleDays: number): Promise<boolean> {
  try {
    const fileStat = await stat(path);
    const ageMs = Date.now() - fileStat.mtimeMs;
    return ageMs > staleDays * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function cachePathFor(api: ApiEntry): string {
  return join(CACHE_DIR, `${api.slug}.png`);
}

async function selectTargets(apis: ApiEntry[], options: Options): Promise<ApiEntry[]> {
  const candidates = options.slugs ? apis.filter((api) => options.slugs?.has(api.slug)) : apis;

  if (options.force) {
    return options.limit ? candidates.slice(0, options.limit) : candidates;
  }

  const selected: ApiEntry[] = [];

  for (const api of candidates) {
    const cachePath = cachePathFor(api);
    if (await isStale(cachePath, options.staleDays)) {
      selected.push(api);
    }

    if (options.limit && selected.length >= options.limit) {
      break;
    }
  }

  return selected;
}

async function captureOne(browser: Browser, api: ApiEntry): Promise<boolean> {
  let context: Awaited<ReturnType<Browser["newContext"]>> | null = null;
  try {
    context = await browser.newContext({
      viewport: VIEWPORT,
      ignoreHTTPSErrors: true,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    await page.goto(api.screenshotTargetUrl, {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_TIMEOUT_MS
    });

    await page.addStyleTag({
      content: `
        * { caret-color: transparent !important; }
        iframe[src*="intercom"], iframe[src*="hubspot"], iframe[src*="crisp"] { display: none !important; }
      `
    }).catch(() => undefined);

    await page.waitForTimeout(1500);
    const path = cachePathFor(api);
    await ensureDirectory(dirname(path));
    await page.screenshot({
      path,
      type: "png",
      fullPage: false,
      animations: "disabled"
    });

    return true;
  } catch {
    const path = cachePathFor(api);
    if (await fileExists(path)) {
      return true;
    }

    return false;
  } finally {
    if (context) {
      await withTimeout(
        context.close().catch(() => undefined),
        CLOSE_TIMEOUT_MS,
        undefined
      );
    }
  }
}

async function cleanupOrphanedScreenshots(validSlugs: Set<string>): Promise<void> {
  try {
    const entries = await readdir(CACHE_DIR, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
        .map(async (entry) => {
          const slug = entry.name.replace(/\.png$/, "");
          if (!validSlugs.has(slug)) {
            await rm(join(CACHE_DIR, entry.name), { force: true });
          }
        })
    );
  } catch {
    // Ignore if the cache directory does not exist yet.
  }
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const ignoreList = await loadIgnoreList();
  const sourceRecords = await loadSourceRecords();
  const apis = applyIgnoreList(normalizeRecords(sourceRecords), ignoreList);
  const targets = await selectTargets(apis, options);
  const validSlugs = new Set(apis.map((api) => api.slug));

  await ensureDirectory(CACHE_DIR);
  await cleanupOrphanedScreenshots(validSlugs);

  console.log(
    `Preparing screenshots for ${targets.length} of ${apis.length} APIs (concurrency ${options.concurrency}, stale ${options.staleDays}d${options.force ? ", force" : ""}${options.slugs ? `, scoped to ${options.slugs.size} slugs` : ""}).`
  );

  const queue = [...targets];
  const results: CaptureResult = { ok: 0, skipped: apis.length - targets.length, failed: 0 };
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"]
  });

  async function worker(workerId: number): Promise<void> {
    while (true) {
      const api = queue.shift();
      if (!api) {
        return;
      }

      const success = await captureOne(browser, api);
      if (success) {
        results.ok += 1;
      } else {
        results.failed += 1;
        console.warn(`[screenshots ${workerId}] failed: ${api.name} <${api.screenshotTargetUrl}>`);
      }

      const processed = results.ok + results.failed;
      if (processed > 0 && processed % 25 === 0) {
        console.log(`[screenshots] processed ${processed} / ${targets.length}`);
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: options.concurrency }, (_, index) => worker(index + 1)));
  } finally {
    await withTimeout(
      browser.close().catch(() => undefined),
      CLOSE_TIMEOUT_MS,
      undefined
    );
  }

  console.log(
    JSON.stringify(
      {
        totalApis: apis.length,
        targeted: targets.length,
        captured: results.ok,
        skipped: results.skipped,
        failed: results.failed,
        cacheDir: CACHE_DIR
      },
      null,
      2
    )
  );
}

await run();
