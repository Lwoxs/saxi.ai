import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ApiEntry } from "./types.js";

export interface IgnoreListEntry {
  id: string;
  name: string;
  docsUrl: string;
  reason: string;
  checkedAt: string;
  status?: number | undefined;
  finalUrl?: string | undefined;
  title?: string | undefined;
}

export interface IgnoreListFile {
  generatedAt: string;
  entries: IgnoreListEntry[];
}

export const IGNORE_LIST_PATH = resolve(process.cwd(), "data", "api-ignore-list.json");

export async function loadIgnoreList(): Promise<IgnoreListFile> {
  try {
    const raw = await readFile(IGNORE_LIST_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<IgnoreListFile>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.filter(isIgnoreListEntry) : [];

    return {
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : "",
      entries
    };
  } catch {
    return {
      generatedAt: "",
      entries: []
    };
  }
}

export function applyIgnoreList(apis: ApiEntry[], ignoreList: IgnoreListFile): ApiEntry[] {
  if (ignoreList.entries.length === 0) {
    return apis;
  }

  const ignoredIds = new Set(ignoreList.entries.map((entry) => entry.id));
  const ignoredUrls = new Set(ignoreList.entries.map((entry) => entry.docsUrl));

  return apis.filter((api) => !ignoredIds.has(api.id) && !ignoredUrls.has(api.docsUrl));
}

function isIgnoreListEntry(value: unknown): value is IgnoreListEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<IgnoreListEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.docsUrl === "string" &&
    typeof candidate.reason === "string" &&
    typeof candidate.checkedAt === "string"
  );
}
