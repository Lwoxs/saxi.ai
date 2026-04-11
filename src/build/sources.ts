import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parse as parseYaml } from "yaml";

import { SOURCE_DEFINITIONS } from "./constants.js";
import type { SourceDefinition, SourceRecord } from "./types.js";
import { normalizeUrl, parseMarkdownLink, safeUrl, splitMarkdownTableRow, stripMarkdown } from "./utils.js";

const COMMUNITY_APIS_DIR = resolve(process.cwd(), "data", "community-apis");
const COMMUNITY_SOURCE = {
  id: "saxi-community",
  label: "saxi.ai community submissions",
  repoUrl: "https://github.com/alexander-schneider/saxi.ai/tree/main/data/community-apis",
  license: "Submitted by pull request"
};

interface CommunityApiRecord {
  name?: unknown;
  description?: unknown;
  docsUrl?: unknown;
  websiteUrl?: unknown;
  categories?: unknown;
  auth?: unknown;
  cors?: unknown;
  https?: unknown;
  free?: unknown;
  protocol?: unknown;
  openapiUrl?: unknown;
  openapiType?: unknown;
}

async function fetchSourceText(source: SourceDefinition): Promise<string> {
  const response = await fetch(source.dataUrl, {
    headers: {
      "user-agent": "saxi-build/0.1 (+https://saxi.ai)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.id}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function createMarkdownRecord(
  source: SourceDefinition,
  category: string,
  columns: string[]
): SourceRecord | null {
  if (columns.length < 5) {
    return null;
  }

  const link = parseMarkdownLink(columns[0] ?? "");
  const docsUrl = safeUrl(link?.url);
  if (!link || !docsUrl) {
    return null;
  }

  return {
    sourceId: source.id,
    sourceLabel: source.label,
    sourceRepo: source.repoUrl,
    sourceLicense: source.license,
    name: link.label,
    description: stripMarkdown(columns[1] ?? ""),
    docsUrl,
    websiteUrl: docsUrl,
    categories: [category],
    authRaw: stripMarkdown(columns[2] ?? ""),
    https: /yes/i.test(columns[3] ?? ""),
    corsRaw: stripMarkdown(columns[4] ?? ""),
    isFree: true
  };
}

function parseMarkdownCatalog(source: SourceDefinition, markdown: string): SourceRecord[] {
  const lines = markdown.split(/\r?\n/);
  const records: SourceRecord[] = [];
  let currentCategory: string | null = null;
  let foundIndex = false;
  let insideTable = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";

    if (line.startsWith("## Index")) {
      foundIndex = true;
      continue;
    }

    if (!foundIndex) {
      continue;
    }

    const headingMatch = line.match(/^###\s+(.+)$/);
    if (headingMatch) {
      currentCategory = stripMarkdown(headingMatch[1] ?? "");
      insideTable = false;
      continue;
    }

    if (!currentCategory || !line.startsWith("|")) {
      continue;
    }

    const nextLine = (lines[index + 1] ?? "").trim();

    if (!insideTable && nextLine.startsWith("|")) {
      insideTable = true;
      index += 1;
      continue;
    }

    if (/^(\|[\s:-]+)+\|?$/.test(line)) {
      continue;
    }

    const columns = splitMarkdownTableRow(line);
    const record = createMarkdownRecord(source, currentCategory, columns);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

function parseToolsCollectionCatalog(source: SourceDefinition, yamlText: string): SourceRecord[] {
  const parsed = parseYaml(yamlText);
  if (!Array.isArray(parsed)) {
    throw new Error("tools-collection dist/apis-list.yaml did not parse into an array");
  }

  const records: SourceRecord[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const toolEntry = entry as Record<string, unknown>;
    const name = typeof toolEntry.name === "string" ? toolEntry.name : "";
    const description =
      typeof toolEntry.description === "string" ? stripMarkdown(toolEntry.description) : "";
    const categories = Array.isArray(toolEntry.categories)
      ? toolEntry.categories.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const isFree = toolEntry.is_free === true;
    const links = Array.isArray(toolEntry.links) ? toolEntry.links : [];
    const primaryLink = links.find(
      (link: unknown) =>
        link &&
        typeof link === "object" &&
        typeof (link as { url?: unknown }).url === "string" &&
        typeof (link as { name?: unknown }).name === "string" &&
        /docs|website|reference/i.test((link as { name: string }).name)
    ) ??
      links.find(
        (link: unknown) => link && typeof link === "object" && typeof (link as { url?: unknown }).url === "string"
      );

    const primaryLinkUrl =
      primaryLink && typeof primaryLink === "object" && typeof (primaryLink as { url?: unknown }).url === "string"
        ? ((primaryLink as { url: string }).url)
        : undefined;
    const docsUrl = safeUrl(primaryLinkUrl);
    if (!name || !description || !docsUrl || !isFree) {
      continue;
    }

    const protocolRaw = typeof toolEntry.type === "string" ? toolEntry.type : undefined;
    const specificationUrl =
      toolEntry.specification &&
      typeof toolEntry.specification === "object" &&
      typeof (toolEntry.specification as { url?: unknown }).url === "string"
        ? normalizeUrl((toolEntry.specification as { url: string }).url)
        : undefined;
    const specificationType =
      toolEntry.specification &&
      typeof toolEntry.specification === "object" &&
      typeof (toolEntry.specification as { type?: unknown }).type === "string"
        ? ((toolEntry.specification as { type: string }).type)
        : undefined;

    const record: SourceRecord = {
      sourceId: source.id,
      sourceLabel: source.label,
      sourceRepo: source.repoUrl,
      sourceLicense: source.license,
      name,
      description,
      docsUrl,
      websiteUrl: docsUrl,
      categories,
      isFree: true
    };

    if (protocolRaw) {
      record.protocolRaw = protocolRaw;
    }

    if (specificationUrl) {
      record.specificationUrl = specificationUrl;
    }

    if (specificationType) {
      record.specificationType = specificationType;
    }

    records.push(record);
  }

  return records;
}

function normalizeCommunityRecord(entry: unknown): SourceRecord | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const candidate = entry as CommunityApiRecord;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const description = typeof candidate.description === "string" ? stripMarkdown(candidate.description).trim() : "";
  const docsUrl = typeof candidate.docsUrl === "string" ? safeUrl(candidate.docsUrl) : null;
  const websiteUrl = typeof candidate.websiteUrl === "string" ? safeUrl(candidate.websiteUrl) : docsUrl;
  const categories = Array.isArray(candidate.categories)
    ? candidate.categories.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (!name || !description || !docsUrl || categories.length === 0 || candidate.free !== true) {
    return null;
  }

  const record: SourceRecord = {
    sourceId: COMMUNITY_SOURCE.id,
    sourceLabel: COMMUNITY_SOURCE.label,
    sourceRepo: COMMUNITY_SOURCE.repoUrl,
    sourceLicense: COMMUNITY_SOURCE.license,
    name,
    description,
    docsUrl,
    websiteUrl: websiteUrl ?? docsUrl,
    categories,
    isFree: true
  };

  if (typeof candidate.auth === "string") {
    record.authRaw = candidate.auth;
  }

  if (typeof candidate.cors === "string") {
    record.corsRaw = candidate.cors;
  }

  if (typeof candidate.https === "boolean") {
    record.https = candidate.https;
  }

  if (typeof candidate.protocol === "string") {
    record.protocolRaw = candidate.protocol;
  }

  if (typeof candidate.openapiUrl === "string" && candidate.openapiUrl.trim().length > 0) {
    const specificationUrl = safeUrl(candidate.openapiUrl);
    if (specificationUrl) {
      record.specificationUrl = specificationUrl;
      record.specificationType = typeof candidate.openapiType === "string" ? candidate.openapiType : "OpenAPI";
    }
  }

  return record;
}

async function loadCommunityRecords(): Promise<SourceRecord[]> {
  let entries;
  try {
    entries = await readdir(COMMUNITY_APIS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const records: SourceRecord[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.startsWith("_")) {
      continue;
    }

    const raw = await readFile(resolve(COMMUNITY_APIS_DIR, entry.name), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const values = Array.isArray(parsed) ? parsed : [parsed];

    for (const value of values) {
      const record = normalizeCommunityRecord(value);
      if (record) {
        records.push(record);
      }
    }
  }

  return records;
}

export async function loadSourceRecords(): Promise<SourceRecord[]> {
  const sourceTexts = await Promise.all(
    SOURCE_DEFINITIONS.map(async (source) => ({
      source,
      text: await fetchSourceText(source)
    }))
  );

  const records: SourceRecord[] = [];

  for (const { source, text } of sourceTexts) {
    if (source.id === "tools-collection") {
      records.push(...parseToolsCollectionCatalog(source, text));
      continue;
    }

    records.push(...parseMarkdownCatalog(source, text));
  }

  records.push(...await loadCommunityRecords());

  return records;
}
