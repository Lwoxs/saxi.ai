import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function unique<T>(items: Iterable<T>): T[] {
  return [...new Set(items)];
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function stripMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_")) {
      url.searchParams.delete(key);
    }
  }

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function safeUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    return normalizeUrl(rawUrl);
  } catch {
    return null;
  }
}

export function extractDomain(rawUrl: string): string {
  const url = new URL(rawUrl);
  return normalizeHost(url.hostname);
}

export function normalizeHost(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/^(docs|developer|developers|api|platform)\./, "");
}

export function parseMarkdownLink(cell: string): { label: string; url: string } | null {
  const match = cell.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!match) {
    return null;
  }

  return { label: stripMarkdown(match[1] ?? ""), url: match[2] ?? "" };
}

export function splitMarkdownTableRow(row: string): string[] {
  return row
    .split("|")
    .map((part) => part.trim())
    .filter((part, index, parts) => !(part.length === 0 && (index === 0 || index === parts.length - 1)));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

export function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

export function sentenceCase(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await mkdir(new URL(".", `file://${path}`).pathname, { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function writeGeneratedFile(path: string, content: string | Buffer): Promise<void> {
  await mkdir(new URL(".", `file://${path}`).pathname, { recursive: true });
  await writeFile(path, content);
}

export function assetExtension(url: string): string {
  const extension = extname(new URL(url).pathname).toLowerCase();
  return extension === ".png" || extension === ".jpg" || extension === ".jpeg" || extension === ".webp"
    ? extension
    : ".svg";
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
