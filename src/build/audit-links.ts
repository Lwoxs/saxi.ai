import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { loadIgnoreList, type IgnoreListEntry, IGNORE_LIST_PATH } from "./ignore-list.js";
import { normalizeRecords } from "./normalize.js";
import { loadSourceRecords } from "./sources.js";
import type { ApiEntry } from "./types.js";

const AUDIT_REPORT_PATH = resolve(process.cwd(), "data", "api-link-audit-report.json");
const WORKER_COUNT = 10;
const REQUEST_TIMEOUT_MS = 12_000;
const PREVIEW_LIMIT_BYTES = 24_576;

type AuditClassification = "healthy" | "warning" | "ignore";

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
  error?: string | undefined;
}

function userAgent(): string {
  return "saxi-link-audit/0.1 (+https://saxi.ai)";
}

async function readPreviewText(response: Response, limitBytes = PREVIEW_LIMIT_BYTES): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;

  try {
    while (total < limitBytes) {
      const { done, value } = await reader.read();
      if (done || !value) {
        break;
      }

      const remaining = limitBytes - total;
      const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(decoder.decode(slice, { stream: true }));
      total += slice.byteLength;

      if (slice.byteLength < value.byteLength) {
        break;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancellation errors from already-closed streams.
    }
  }

  chunks.push(decoder.decode());
  return chunks.join("");
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || undefined;
}

function normalizeText(value: string | undefined): string {
  return value?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";
}

function isJavascriptRedirectShell(titleText: string, previewText: string): boolean {
  const hasClientRedirect =
    previewText.includes("window.location.replace(") ||
    previewText.includes("window.location.href =") ||
    previewText.includes("window.location.assign(");

  if (!hasClientRedirect) {
    return false;
  }

  const hasTrackingShellMarkers =
    previewText.includes("fingerprintjs.load") ||
    previewText.includes("redirect_link =") ||
    previewText.includes("tr_uuid=") ||
    previewText.includes("?ch=1&js=") ||
    previewText.includes("&sid=") ||
    previewText.includes("&fp=");

  return titleText === "loading..." || hasTrackingShellMarkers;
}

function classifyResponse(api: ApiEntry, response: Response, preview: string): Omit<AuditResult, "checkedAt"> {
  const title = extractTitle(preview);
  const finalUrl = response.url || api.docsUrl;
  const contentType = response.headers.get("content-type") ?? undefined;
  const titleText = normalizeText(title);
  const previewLead = normalizeText(preview.slice(0, 1200));
  const previewText = normalizeText(preview.slice(0, PREVIEW_LIMIT_BYTES));
  const finalLower = normalizeText(finalUrl);
  const finalHost = new URL(finalUrl).hostname.toLowerCase();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      return {
        id: api.id,
        name: api.name,
        docsUrl: api.docsUrl,
        classification: "warning",
        reason: `http_${response.status}`,
        status: response.status,
        finalUrl,
        title,
        contentType
      };
    }

    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: `http_${response.status}`,
      status: response.status,
      finalUrl,
      title,
      contentType
    };
  }

  if (
    /domain for sale|buy this domain|this domain is for sale|parked|informationen zum thema|coming soon/i.test(titleText) ||
    /parkingcrew|sedo|bodis|hugedomains|uniregistry|afternic|dan\.com/.test(finalHost)
  ) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: "parked_domain",
      status: response.status,
      finalUrl,
      title,
      contentType
    };
  }

  if (
    /^(404|404:|not found|page not found)|404 not found|site not found/.test(titleText) ||
    /\/404(?:[/?#]|$)|\/not-found(?:[/?#]|$)/.test(finalLower) ||
    (!titleText && /^(404|not found|page not found)/.test(previewLead)) ||
    previewText.includes("404: this page could not be found.") ||
    previewText.includes("this page could not be found.") ||
    previewText.includes("\"children\":\"this page could not be found.\"")
  ) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: "soft_404",
      status: response.status,
      finalUrl,
      title,
      contentType
    };
  }

  if (isJavascriptRedirectShell(titleText, previewText)) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: "javascript_redirect_shell",
      status: response.status,
      finalUrl,
      title,
      contentType
    };
  }

  if (/access denied|just a moment|attention required|temporarily unavailable|service unavailable/.test(titleText)) {
    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "warning",
      reason: "protected_or_unavailable",
      status: response.status,
      finalUrl,
      title,
      contentType
    };
  }

  return {
    id: api.id,
    name: api.name,
    docsUrl: api.docsUrl,
    classification: "healthy",
    reason: "ok",
    status: response.status,
    finalUrl,
    title,
    contentType
  };
}

async function auditApi(api: ApiEntry): Promise<AuditResult> {
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(api.docsUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "user-agent": userAgent(),
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"
      }
    });

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const preview = /text\/html|application\/xhtml\+xml/.test(contentType) ? await readPreviewText(response) : "";
    return {
      ...classifyResponse(api, response, preview),
      checkedAt
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = /aborted|timeout/i.test(message);

    return {
      id: api.id,
      name: api.name,
      docsUrl: api.docsUrl,
      classification: "ignore",
      reason: timedOut ? "timeout" : "network_error",
      checkedAt,
      error: message
    };
  }
}

async function runWorker(workerId: number, apis: ApiEntry[], results: AuditResult[]): Promise<void> {
  while (true) {
    const api = apis.shift();
    if (!api) {
      return;
    }

    const result = await auditApi(api);
    results.push(result);

    const index = results.length;
    if (index % 50 === 0) {
      console.log(`[worker ${workerId}] checked ${index} / ${index + apis.length}`);
    }
  }
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
  const sourceRecords = await loadSourceRecords();
  const apis = normalizeRecords(sourceRecords);
  const existingIgnoreList = await loadIgnoreList();
  const queue = [...apis];
  const results: AuditResult[] = [];

  console.log(`Auditing ${queue.length} APIs with ${WORKER_COUNT} workers.`);

  await Promise.all(Array.from({ length: WORKER_COUNT }, (_, index) => runWorker(index + 1, queue, results)));

  results.sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));

  const ignoreEntries = results
    .filter((result) => result.classification === "ignore")
    .map(toIgnoreEntry)
    .sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));

  const report = {
    generatedAt: new Date().toISOString(),
    workerCount: WORKER_COUNT,
    total: results.length,
    healthy: results.filter((result) => result.classification === "healthy").length,
    warnings: results.filter((result) => result.classification === "warning").length,
    ignored: ignoreEntries.length,
    previousIgnored: existingIgnoreList.entries.length,
    results
  };

  await writeJsonFile(AUDIT_REPORT_PATH, report);
  await writeJsonFile(IGNORE_LIST_PATH, {
    generatedAt: report.generatedAt,
    entries: ignoreEntries
  });

  console.log(
    JSON.stringify(
      {
        report: AUDIT_REPORT_PATH,
        ignoreList: IGNORE_LIST_PATH,
        total: report.total,
        healthy: report.healthy,
        warnings: report.warnings,
        ignored: report.ignored
      },
      null,
      2
    )
  );
}

await main();
