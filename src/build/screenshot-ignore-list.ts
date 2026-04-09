import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface ScreenshotIgnoreEntry {
  id?: string;
  url?: string;
  reason: string;
}

interface ScreenshotIgnoreFile {
  entries: ScreenshotIgnoreEntry[];
}

const SCREENSHOT_IGNORE_LIST_PATH = resolve(process.cwd(), "data", "screenshot-ignore-list.json");

export async function loadScreenshotIgnoreList(): Promise<ScreenshotIgnoreFile> {
  try {
    const raw = await readFile(SCREENSHOT_IGNORE_LIST_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<ScreenshotIgnoreFile>;
    return {
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.filter((entry): entry is ScreenshotIgnoreEntry => {
            if (!entry || typeof entry !== "object") {
              return false;
            }

            const candidate = entry as Partial<ScreenshotIgnoreEntry>;
            return (
              typeof candidate.reason === "string" &&
              (typeof candidate.id === "string" || typeof candidate.url === "string")
            );
          })
        : []
    };
  } catch {
    return { entries: [] };
  }
}
