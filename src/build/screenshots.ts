import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ApiEntry } from "./types.js";
import { escapeHtml } from "./utils.js";

const DIST_SCREENSHOT_DIR = "dist/assets/screenshots";
const CACHE_SCREENSHOT_DIR = ".cache/screenshots";

function placeholderSvg(api: ApiEntry): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" fill="none">
  <defs>
    <linearGradient id="bg" x1="80" y1="40" x2="1180" y2="720" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B1526" />
      <stop offset="1" stop-color="#10243C" />
    </linearGradient>
    <linearGradient id="signal" x1="140" y1="120" x2="1000" y2="620" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4BE3C2" stop-opacity="0.35" />
      <stop offset="1" stop-color="#7AF1D7" stop-opacity="0.05" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" rx="42" fill="url(#bg)" />
  <rect x="32" y="32" width="1216" height="656" rx="30" stroke="rgba(255,255,255,0.16)" />
  <rect x="76" y="76" width="1128" height="568" rx="28" fill="#09111E" />
  <rect x="76" y="76" width="1128" height="568" rx="28" fill="url(#signal)" />
  <rect x="122" y="120" width="260" height="38" rx="19" fill="rgba(255,255,255,0.08)" />
  <rect x="122" y="194" width="660" height="70" rx="24" fill="rgba(255,255,255,0.08)" />
  <rect x="122" y="296" width="940" height="24" rx="12" fill="rgba(255,255,255,0.08)" />
  <rect x="122" y="338" width="892" height="24" rx="12" fill="rgba(255,255,255,0.08)" />
  <rect x="122" y="380" width="732" height="24" rx="12" fill="rgba(255,255,255,0.08)" />
  <rect x="122" y="474" width="150" height="46" rx="23" fill="rgba(75,227,194,0.18)" />
  <rect x="292" y="474" width="182" height="46" rx="23" fill="rgba(255,255,255,0.08)" />
  <rect x="494" y="474" width="210" height="46" rx="23" fill="rgba(255,255,255,0.08)" />
  <text x="122" y="151" fill="#CFD7E5" font-family="'IBM Plex Mono', monospace" font-size="26" letter-spacing="3">${escapeHtml(api.primaryCategory.toUpperCase())}</text>
  <text x="122" y="245" fill="#F5F7FB" font-family="'Space Grotesk', sans-serif" font-size="54" font-weight="700">${escapeHtml(api.name)}</text>
  <text x="122" y="592" fill="#9FB0C8" font-family="'IBM Plex Mono', monospace" font-size="28">${escapeHtml(api.domain)}</text>
</svg>`;
}

async function writePlaceholder(api: ApiEntry): Promise<string> {
  const outputPath = join(DIST_SCREENSHOT_DIR, `${api.slug}.svg`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, placeholderSvg(api), "utf8");
  return `/assets/screenshots/${api.slug}.svg`;
}

async function fetchRemoteScreenshot(api: ApiEntry): Promise<string | null> {
  const baseUrl = process.env.SCREENSHOT_API_BASE_URL;
  if (!baseUrl) {
    return null;
  }

  const cachePath = join(CACHE_SCREENSHOT_DIR, `${api.slug}.png`);
  const outputPath = join(DIST_SCREENSHOT_DIR, `${api.slug}.png`);

  try {
    await mkdir(dirname(cachePath), { recursive: true });
    let imageBuffer: Buffer | null = null;

    try {
      imageBuffer = await readFile(cachePath);
    } catch {
      const url = new URL("/internal/screenshot", baseUrl);
      url.searchParams.set("url", api.screenshotTargetUrl);
      const requestInit = process.env.SCREENSHOT_API_TOKEN
        ? {
            headers: {
              authorization: `Bearer ${process.env.SCREENSHOT_API_TOKEN}`
            }
          }
        : {};

      const response = await fetch(url, requestInit);

      if (!response.ok) {
        return null;
      }

      imageBuffer = Buffer.from(await response.arrayBuffer());
      await writeFile(cachePath, imageBuffer);
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await copyFile(cachePath, outputPath);
    return `/assets/screenshots/${api.slug}.png`;
  } catch {
    return null;
  }
}

export async function materializeScreenshots(apis: ApiEntry[]): Promise<ApiEntry[]> {
  const hydrated: ApiEntry[] = [];

  for (const api of apis) {
    const remoteScreenshot = await fetchRemoteScreenshot(api);
    const screenshotPath = remoteScreenshot ?? (await writePlaceholder(api));
    hydrated.push({
      ...api,
      screenshotPath
    });
  }

  return hydrated;
}
