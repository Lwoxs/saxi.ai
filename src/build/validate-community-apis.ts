import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { COMMUNITY_API_CATEGORIES } from "./constants.js";

const COMMUNITY_APIS_DIR = resolve(process.cwd(), "data", "community-apis");
const ALLOWED_CATEGORIES = new Set<string>(COMMUNITY_API_CATEGORIES);
const ALLOWED_AUTH_TYPES = new Set(["No Auth", "API Key", "OAuth", "Basic Auth", "Unknown"]);
const ALLOWED_CORS_VALUES = new Set(["Yes", "No", "Unknown"]);
const ALLOWED_PROTOCOLS = new Set(["REST", "GraphQL", "WebSocket", "gRPC"]);
const FILENAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER_FILENAMES = new Set(["replace-with-api-name.json", "your-api.json"]);

interface ValidationIssue {
  file: string;
  message: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function urlField(record: Record<string, unknown>, key: string): URL | null {
  const value = stringField(record, key);
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function validateCommunityApi(file: string, record: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!FILENAME_PATTERN.test(file)) {
    issues.push({
      file,
      message: "Filename must be lowercase kebab-case, for example `my-example-api.json`."
    });
  } else if (PLACEHOLDER_FILENAMES.has(file)) {
    issues.push({
      file,
      message: "Filename still uses the template placeholder. Rename it to the real API name, for example `my-example-api.json`."
    });
  }

  if (!isObject(record)) {
    return [...issues, { file, message: "File must contain one JSON object, not an array or primitive value." }];
  }

  const name = stringField(record, "name");
  if (name === "Example API") {
    issues.push({ file, message: "`name` still uses the template placeholder. Replace it with the real API name." });
  } else if (!name || name.length < 2 || name.length > 80) {
    issues.push({ file, message: "`name` is required and must be 2-80 characters." });
  }

  const description = stringField(record, "description");
  if (description === "One clear sentence describing what the API does.") {
    issues.push({
      file,
      message: "`description` still uses the template placeholder. Replace it with a factual 20-240 character description."
    });
  } else if (!description || description.length < 20 || description.length > 240) {
    issues.push({
      file,
      message: "`description` is required, must be factual, and must be 20-240 characters."
    });
  }

  const docsUrl = urlField(record, "docsUrl");
  if (docsUrl?.hostname === "example.com") {
    issues.push({ file, message: "`docsUrl` still uses example.com. Replace it with the real public documentation URL." });
  } else if (!docsUrl) {
    issues.push({ file, message: "`docsUrl` is required and must be a public http(s) URL." });
  }

  const websiteUrl = urlField(record, "websiteUrl");
  if (websiteUrl?.hostname === "example.com") {
    issues.push({ file, message: "`websiteUrl` still uses example.com. Replace it with the real public website URL." });
  } else if (!websiteUrl) {
    issues.push({ file, message: "`websiteUrl` is required and must be a public http(s) URL." });
  }

  const https = record.https;
  if (typeof https !== "boolean") {
    issues.push({ file, message: "`https` is required and must be a boolean." });
  } else if (https && (docsUrl?.protocol !== "https:" || websiteUrl?.protocol !== "https:")) {
    issues.push({
      file,
      message: "`https` is true, so both `docsUrl` and `websiteUrl` must use https URLs."
    });
  }

  if (record.free !== true) {
    issues.push({ file, message: "`free` is required and must be true. Paid-only APIs are not accepted." });
  }

  const addedAt = stringField(record, "addedAt");
  if (addedAt && (!DATE_PATTERN.test(addedAt) || Number.isNaN(Date.parse(addedAt)))) {
    issues.push({ file, message: "`addedAt`, when set, must use YYYY-MM-DD format." });
  }

  const categories = record.categories;
  if (!Array.isArray(categories) || categories.length === 0 || categories.length > 3) {
    issues.push({ file, message: "`categories` must contain 1-3 values from the allowed category list." });
  } else {
    const seen = new Set<string>();
    for (const category of categories) {
      if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category)) {
        issues.push({
          file,
          message: `Invalid category \`${String(category)}\`. Use one of: ${COMMUNITY_API_CATEGORIES.join(", ")}.`
        });
        continue;
      }

      if (seen.has(category)) {
        issues.push({ file, message: `Duplicate category \`${category}\`.` });
      }
      seen.add(category);
    }
  }

  const auth = stringField(record, "auth");
  if (!auth || !ALLOWED_AUTH_TYPES.has(auth)) {
    issues.push({ file, message: "`auth` must be one of: No Auth, API Key, OAuth, Basic Auth, Unknown." });
  }

  const cors = stringField(record, "cors");
  if (!cors || !ALLOWED_CORS_VALUES.has(cors)) {
    issues.push({ file, message: "`cors` must be one of: Yes, No, Unknown." });
  }

  const openapiUrl = stringField(record, "openapiUrl");
  if (openapiUrl && !urlField(record, "openapiUrl")) {
    issues.push({ file, message: "`openapiUrl` must be empty or a valid http(s) URL." });
  }

  const protocol = stringField(record, "protocol");
  if (protocol && !ALLOWED_PROTOCOLS.has(protocol)) {
    issues.push({ file, message: "`protocol`, when set, must be one of: REST, GraphQL, WebSocket, gRPC." });
  }

  const notes = stringField(record, "notes");
  if (notes === "Why should this API be listed on saxi.ai?") {
    issues.push({ file, message: "`notes` still uses the template placeholder. Explain why this API belongs in the directory." });
  } else if (!notes || notes.length < 10 || notes.length > 500) {
    issues.push({ file, message: "`notes` is required and must explain why the API should be listed." });
  }

  return issues;
}

async function main(): Promise<void> {
  const entries = await readdir(COMMUNITY_APIS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const raw = await readFile(resolve(COMMUNITY_APIS_DIR, file), "utf8");
    try {
      issues.push(...validateCommunityApi(file, JSON.parse(raw) as unknown));
    } catch (error) {
      issues.push({
        file,
        message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`- ${issue.file}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${files.length} community API submission file${files.length === 1 ? "" : "s"}.`);
}

await main();
