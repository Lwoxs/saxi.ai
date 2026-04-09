import { access, readdir, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const DIST_DIR = resolve(process.cwd(), "dist");
const SITE_ORIGIN = "https://saxi.ai";
const LINK_PATTERN = /\b(?:href|src)=["']([^"']+)["']/g;

async function walkHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const targetPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return walkHtmlFiles(targetPath);
      }

      if (entry.isFile() && targetPath.endsWith(".html")) {
        return [targetPath];
      }

      return [];
    })
  );

  return files.flat();
}

function fileToSitePath(filePath) {
  const relativePath = relative(DIST_DIR, filePath).replaceAll("\\", "/");
  if (relativePath === "index.html") {
    return "/";
  }

  if (relativePath.endsWith("/index.html")) {
    return `/${relativePath.slice(0, -"index.html".length)}`;
  }

  return `/${relativePath}`;
}

function resolveInternalPath(reference, pagePath) {
  const trimmed = reference.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
  ) {
    return null;
  }

  const sanitized = trimmed.split("#", 1)[0];
  if (!sanitized) {
    return null;
  }

  const targetUrl = new URL(sanitized, new URL(pagePath, SITE_ORIGIN));
  return decodeURIComponent(targetUrl.pathname);
}

function candidatePaths(pathname) {
  if (pathname === "/") {
    return [join(DIST_DIR, "index.html")];
  }

  const relativePath = pathname.replace(/^\/+/, "");
  if (pathname.endsWith("/")) {
    return [join(DIST_DIR, relativePath, "index.html")];
  }

  if (extname(relativePath)) {
    return [join(DIST_DIR, relativePath)];
  }

  return [
    join(DIST_DIR, relativePath),
    join(DIST_DIR, relativePath, "index.html"),
    join(DIST_DIR, `${relativePath}.html`)
  ];
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const htmlFiles = await walkHtmlFiles(DIST_DIR);
  const failures = [];
  let checkedReferences = 0;

  for (const htmlFile of htmlFiles) {
    const pagePath = fileToSitePath(htmlFile);
    const content = await readFile(htmlFile, "utf8");

    for (const match of content.matchAll(LINK_PATTERN)) {
      const reference = match[1];
      const internalPath = resolveInternalPath(reference, pagePath);
      if (!internalPath) {
        continue;
      }

      checkedReferences += 1;
      const candidates = candidatePaths(internalPath);
      const found = await Promise.all(candidates.map((candidate) => pathExists(candidate)));

      if (!found.some(Boolean)) {
        failures.push({
          page: pagePath,
          reference,
          resolved: internalPath
        });
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Found ${failures.length} missing internal references.`);
    for (const failure of failures) {
      console.error(`- ${failure.page} -> ${failure.reference} (${failure.resolved})`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${checkedReferences} internal references across ${htmlFiles.length} HTML files.`);
}

await main();
