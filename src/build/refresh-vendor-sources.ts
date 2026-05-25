import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { SOURCE_DEFINITIONS } from "./constants.js";
import type { SourceDefinition } from "./types.js";

const USER_AGENT = "saxi-build/0.1 (+https://saxi.ai)";
const TOOLS_COLLECTION_TREE_URL =
  "https://api.github.com/repos/tools-collection/apis-collection/git/trees/main?recursive=1";
const TOOLS_COLLECTION_RAW_BASE = "https://raw.githubusercontent.com/tools-collection/apis-collection/main/";
const BATCH_SIZE = 20;

interface GitTreeEntry {
  path?: unknown;
  type?: unknown;
}

interface GitTreeResponse {
  tree: GitTreeEntry[];
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/plain, application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchJson(url: string): Promise<unknown> {
  const text = await fetchText(url);
  return JSON.parse(text) as unknown;
}

async function writeSnapshot(path: string, content: string): Promise<void> {
  const absolutePath = resolve(process.cwd(), path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

async function refreshSingleFileSource(source: SourceDefinition): Promise<void> {
  const text = await fetchText(source.dataUrl);
  await writeSnapshot(source.snapshotPath, text);
  console.log(`Updated ${source.snapshotPath}`);
}

function isGitTreeResponse(value: unknown): value is GitTreeResponse {
  if (!value || typeof value !== "object" || !Array.isArray((value as { tree?: unknown }).tree)) {
    return false;
  }

  return (value as { tree: unknown[] }).tree.every((entry) => Boolean(entry && typeof entry === "object"));
}

async function refreshToolsCollection(source: SourceDefinition): Promise<void> {
  const treeResponse = await fetchJson(TOOLS_COLLECTION_TREE_URL);
  if (!isGitTreeResponse(treeResponse)) {
    throw new Error("tools-collection tree response did not include a tree array");
  }

  const paths = treeResponse.tree
    .filter((entry: unknown): entry is GitTreeEntry => Boolean(entry && typeof entry === "object"))
    .map((entry) => entry.path)
    .filter((path): path is string => typeof path === "string")
    .filter((path) => path.startsWith("collection/") && path.endsWith(".yaml"))
    .sort();

  if (paths.length === 0) {
    throw new Error("tools-collection tree did not include collection/*.yaml files");
  }

  const snapshotDir = resolve(process.cwd(), source.snapshotPath);
  await rm(snapshotDir, { recursive: true, force: true });
  await mkdir(snapshotDir, { recursive: true });

  for (let index = 0; index < paths.length; index += BATCH_SIZE) {
    const batch = paths.slice(index, index + BATCH_SIZE);
    await Promise.all(
      batch.map(async (path) => {
        const text = await fetchText(`${TOOLS_COLLECTION_RAW_BASE}${path}`);
        await writeSnapshot(`${source.snapshotPath}/${path.replace("collection/", "")}`, text);
      })
    );
  }

  console.log(`Updated ${source.snapshotPath} (${paths.length} files)`);
}

async function refreshSource(source: SourceDefinition): Promise<void> {
  if (source.id === "tools-collection") {
    await refreshToolsCollection(source);
    return;
  }

  await refreshSingleFileSource(source);
}

for (const source of SOURCE_DEFINITIONS) {
  await refreshSource(source);
}
