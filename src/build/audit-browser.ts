import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { chromium, type Browser } from "playwright";

import { loadIgnoreList, type IgnoreListEntry, IGNORE_LIST_PATH } from "./ignore-list.js";
import { normalizeRecords } from "./normalize.js";
import { loadSourceRecords } from "./sources.js";
import type { ApiEntry } from "./types.js";
import { compareStrings } from "./utils.js";

const AUDIT_REPORT_PATH = resolve(process.cwd(), "data", "api-browser-audit-report.json");
const DEFAULT_WORKER_COUNT = 4;
const DEFAULT_NAVIGATION_TIMEOUT_MS = 15_000;
const DEFAULT_SETTLE_MS = 1_500;
const DEFAULT_CAPTURE_LIMIT = 2_000;
const CLOSE_TIMEOUT_MS = 5_000;

type AuditClassification = "healthy" | "warning" | "ignore";

interface Options {
  applyIgnore: boolean;
  concurrency: number;
  limit: number | null;
  slugs: Set<string> | null;
}

interface AuditResult {
  id: string;
  name: string;
  docsUrl: string;
  classification: AuditClassification;
  reason: string;
  checkedAt: string;
  status?: number | undefined;
  finalUrl?: string | undefined;
  title?: string | undefined;
  contentType?: string | undefined;
  excerpt?: string | undefined;
  error?: string | undefined;
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (const argument of argv) {
    if (!argument.startsWith("--")) {
      continue;
    }

    const [rawKey, rawValue] = argument.slice(2).split("=", 2);
    if (!rawKey) {
      continue;
    }

    if (rawValue === undefined) {
      flags.add(rawKey);
    } else {
      values.set(rawKey, rawValue);
    }
  }

  return {
    applyIgnore: flags.has("apply-ignore"),
    concurrency: Math.max(1, Number(values.get("concurrency") ?? DEFAULT_WORKER_COUNT)),
    limit: values.has("limit") ? Math.max(1, Number(values.get("limit"))) : null,
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

function userAgent(): string {
  return "saxi-browser-audit/0.1 (+https://saxi.ai)";
}

function normalizeText(value: string | undefined): string {
  return value?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";
}

function trimExcerpt(value: string, limit = DEFAULT_CAPTURE_LIMIT): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized.slice(0, limit) : undefined;
}

function looksLikeJavascriptRedirectShell(titleText: string, bodyText: string, pageHtml: string): boolean {
  const normalizedHtml = normalizeText(pageHtml);
  const normalizedBody = normalizeText(bodyText);
  const hasClientRedirect =
    normalizedHtml.includes("window.location.replace(") ||
    normalizedHtml.includes("window.location.href =") ||
    normalizedHtml.includes("window.location.assign(");

  if (!hasClientRedirect) {
    return false;
  }

  const looksLikeThinShell =
    normalizedBody.length < 120 &&
    !/api|docs|developer|documentation|support|pricing|contact|scraperapi/.test(normalizedBody);

  return (
    titleText === "loading..." ||
    looksLikeThinShell ||
    normalizedHtml.includes("fingerprintjs.load") ||
    normalizedHtml.includes("redirect_link =") ||
    normalizedHtml.includes("tr_uuid=") ||
    normalizedHtml.includes("?ch=1&js=")
  );
}

function classifyBrowserPage(
  api: ApiEntry,
  status: number | undefined,
  finalUrl: string,
  title: string | undefined,
  contentType: string | undefined,
  bodyText: string,
  pageHtml: string
): Omit<AuditResult, "checkedAt"> {
  const titleText = normalizeText(title);
  const finalLower = normalizeText(finalUrl);
  const bodyNormalized = normalizeText(bodyText);
  const htmlNormalized = normalizeText(pageHtml);
  const excerpt = trimExcerpt(bodyText || pageHtml);

  if (
    /just a moment|attention required|verify you are human|please enable javascript|cf browser verification|request rate threshold exceeded|vercel security checkpoint|checking your browser/.test(
      `${titleText} ${bodyNormalized}`
    )
  ) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "warning",
      reason: "bot_protection",
      status,
      finalUrl,
      title,
      contentType,
      excerpt
    };
  }

  if (status && status >= 400) {
    if (status === 401 || status === 403 || status === 404 || status === 410 || status >= 500) {
      return {
        id: api.id,
        name: api.name,
        docsUrl: api.docsUrl,
        classification: "ignore",
        reason: `browser_http_${status}`,
        status,
        finalUrl,
        title,
        contentType,
        excerpt
      };
    }

    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "warning",
      reason: `browser_http_${status}`,
      status,
      finalUrl,
      title,
      contentType,
      excerpt
    };
  }

  if (
    /domain for sale|buy this domain|this domain is for sale|parked/.test(titleText) ||
    /parkingcrew|sedo|bodis|hugedomains|uniregistry|afternic|dan\.com/.test(finalLower)
  ) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: "parked_domain",
      status,
      finalUrl,
      title,
      contentType,
      excerpt
    };
  }

  if (
    /^(404|404:|not found|page not found)|404 not found|site not found/.test(titleText) ||
    /\/404(?:[/?#]|$)|\/not-found(?:[/?#]|$)/.test(finalLower) ||
    bodyNormalized.includes("404: this page could not be found.") ||
    bodyNormalized.includes("this page could not be found.") ||
    htmlNormalized.includes("\"children\":\"this page could not be found.\"")
  ) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: "soft_404",
      status,
      finalUrl,
      title,
      contentType,
      excerpt
    };
  }

  if (looksLikeJavascriptRedirectShell(titleText, bodyText, pageHtml)) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: "javascript_redirect_shell",
      status,
      finalUrl,
      title,
      contentType,
      excerpt
    };
  }

  if (
    /access denied|forbidden|temporarily unavailable|service unavailable/.test(titleText) &&
    /you don't have permission|forbidden|access denied|service unavailable/.test(bodyNormalized)
  ) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: "generic_error_page",
      status,
      finalUrl,
      title,
      contentType,
      excerpt
    };
  }

  return {
    id: api.id,
    name: api.name,
    docsUrl: api.docsUrl,
    classification: "healthy",
    reason: "ok",
    status,
    finalUrl,
    title,
    contentType,
    excerpt
  };
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

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"]
  });
}

async function auditApi(browser: Browser, api: ApiEntry): Promise<AuditResult> {
  const checkedAt = new Date().toISOString();
  let context: Awaited<ReturnType<Browser["newContext"]>> | null = null;

  try {
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(DEFAULT_NAVIGATION_TIMEOUT_MS);

    const response = await page.goto(api.docsUrl, {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_NAVIGATION_TIMEOUT_MS
    });

    await page.waitForTimeout(DEFAULT_SETTLE_MS);

    const title = await page.title().catch(() => undefined);
    const finalUrl = page.url();
    const contentType = response?.headers()["content-type"];
    const pageHtml = await page.content().catch(() => "");
    const bodyText = await page.locator("body").innerText().catch(() => "");

    return {
      ...classifyBrowserPage(
        api,
        response?.status(),
        finalUrl,
        title,
        contentType,
        bodyText,
        pageHtml
      ),
      checkedAt
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = /timeout|timed out|net::err/i.test(message);

    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: timedOut ? "browser_timeout" : "browser_error",
      checkedAt,
      error: message
    };
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

async function runWorker(workerId: number, queue: ApiEntry[], results: AuditResult[]): Promise<void> {
  let browser = await launchBrowser();
  let processedByWorker = 0;

  while (true) {
    const api = queue.shift();
    if (!api) {
      break;
    }

    const result = await auditApi(browser, api);
    results.push(result);
    processedByWorker += 1;

    if (results.length % 25 === 0) {
      console.log(`[browser ${workerId}] checked ${results.length} / ${results.length + queue.length}`);
    }

    if (processedByWorker % 10 === 0) {
      await withTimeout(browser.close().catch(() => undefined), CLOSE_TIMEOUT_MS, undefined);
      browser = await launchBrowser();
    }
  }

  await withTimeout(browser.close().catch(() => undefined), CLOSE_TIMEOUT_MS, undefined);
}

function toIgnoreEntry(result: AuditResult): IgnoreListEntry {
  return {
    id: result.id,
    name: result.name,
    docsUrl: result.docsUrl,
    reason: result.reason,
    checkedAt: result.checkedAt,
    status: result.status,
    finalUrl: result.finalUrl,
    title: result.title
  };
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const existingIgnoreList = await loadIgnoreList();
  const sourceRecords = await loadSourceRecords();
  const ignoredIds = new Set(existingIgnoreList.entries.map((entry) => entry.id));
  const ignoredUrls = new Set(existingIgnoreList.entries.map((entry) => entry.docsUrl));
  const activeApis = normalizeRecords(sourceRecords).filter((api) => !ignoredIds.has(api.id) && !ignoredUrls.has(api.docsUrl));
  const filteredApis = options.slugs ? activeApis.filter((api) => options.slugs?.has(api.slug)) : activeApis;
  const queue = options.limit ? filteredApis.slice(0, options.limit) : [...filteredApis];
  const results: AuditResult[] = [];

  console.log(`Browser-auditing ${queue.length} APIs with ${options.concurrency} workers.`);

  await Promise.all(Array.from({ length: options.concurrency }, (_, index) => runWorker(index + 1, queue, results)));

  results.sort((left, right) => compareStrings(left.name, right.name) || compareStrings(left.id, right.id));

  const report = {
    generatedAt: new Date().toISOString(),
    workerCount: options.concurrency,
    total: results.length,
    healthy: results.filter((result) => result.classification === "healthy").length,
    warnings: results.filter((result) => result.classification === "warning").length,
    ignored: results.filter((result) => result.classification === "ignore").length,
    results
  };

  await writeJsonFile(AUDIT_REPORT_PATH, report);

  if (options.applyIgnore) {
    const merged = new Map(existingIgnoreList.entries.map((entry) => [entry.id, entry]));
    for (const result of results.filter((entry) => entry.classification === "ignore")) {
      merged.set(result.id, toIgnoreEntry(result));
    }

    await writeJsonFile(IGNORE_LIST_PATH, {
      generatedAt: report.generatedAt,
      entries: [...merged.values()].sort((left, right) => compareStrings(left.name, right.name) || compareStrings(left.id, right.id))
    });
  }

  console.log(
    JSON.stringify(
      {
        report: AUDIT_REPORT_PATH,
        total: report.total,
        healthy: report.healthy,
        warnings: report.warnings,
        ignored: report.ignored,
        appliedIgnore: options.applyIgnore
      },
      null,
      2
    )
  );
}

await main();
