import {
  CAPABILITY_RULES,
  COLLECTION_DEFINITIONS,
  PAGE_SIZE,
  PRIMARY_CATEGORY_DESCRIPTIONS
} from "./constants.js";
import type {
  ApiEntry,
  CollectionPage,
  CorsSupport,
  SiteData,
  SourceRecord,
  TaxonomyPage
} from "./types.js";
import { compareStrings, extractDomain, normalizeHost, safeUrl, slugify, unique } from "./utils.js";

const PRIMARY_CATEGORY_RULES: Array<{ title: string; keywords: string[] }> = [
  {
    title: "Identity & Auth",
    keywords: ["authentication", "authorization", "identity", "user management", "auth"]
  },
  {
    title: "AI & ML",
    keywords: [
      "ai & ml",
      "machine learning",
      "recognition",
      "voice",
      "translation",
      "text analysis",
      "language",
      "ocr"
    ]
  },
  {
    title: "Search & Retrieval",
    keywords: ["search", "scrapers", "data mining", "tracking", "seo"]
  },
  {
    title: "Developer Tools",
    keywords: [
      "development",
      "continuous integration",
      "programming",
      "testing",
      "open source projects",
      "open source",
      "project management",
      "collaboration",
      "bots"
    ]
  },
  {
    title: "Cloud & Infrastructure",
    keywords: ["cloud storage", "files & storage", "databases", "iot", "home automation", "infrastructure"]
  },
  {
    title: "Finance & Commerce",
    keywords: [
      "finance",
      "economics",
      "payments",
      "commerce",
      "shopping",
      "business",
      "currency",
      "cryptocurrency",
      "blockchain"
    ]
  },
  {
    title: "Maps & Mobility",
    keywords: ["maps", "geo", "geocoding", "transportation", "travel", "vehicles", "point of interest"]
  },
  {
    title: "Media & Entertainment",
    keywords: [
      "images",
      "photography",
      "video",
      "media",
      "music",
      "audio",
      "games",
      "comics",
      "anime",
      "art",
      "design",
      "entertainment"
    ]
  },
  {
    title: "Communication",
    keywords: ["email", "sms", "chats", "messaging", "social", "news", "feeds"]
  },
  {
    title: "Productivity",
    keywords: ["documents", "productivity", "calendar", "forms", "surveys", "books", "dictionaries"]
  },
  {
    title: "Security",
    keywords: ["security", "anti-malware", "fraud", "validation", "verification", "captcha"]
  },
  {
    title: "Health & Lifestyle",
    keywords: ["health", "sport", "fitness", "food", "drink"]
  },
  {
    title: "Knowledge & Open Data",
    keywords: [
      "open data",
      "government",
      "science",
      "math",
      "weather",
      "environment",
      "education",
      "patent",
      "wiki",
      "disasters"
    ]
  },
  {
    title: "Data & Analytics",
    keywords: ["analytics", "statistics", "data", "visualizations"]
  }
];

function normalizeNameKey(name: string): string {
  return slugify(name)
    .replace(/-(api|apis|rest|graphql|service|platform)$/g, "")
    .replace(/-(com|io|org|app)$/g, "")
    .replace(/-+/g, "-");
}

function dedupeKey(record: SourceRecord): string {
  const domain = safeUrl(record.docsUrl) ? extractDomain(record.docsUrl) : normalizeNameKey(record.name);
  return `${normalizeNameKey(record.name)}::${domain}`;
}

function canonicalAuth(rawValue: string | undefined): string {
  const value = rawValue?.replaceAll("`", "").trim().toLowerCase() ?? "";

  if (value.length === 0 || value === "unknown") {
    return "Unknown";
  }

  if (value === "no" || value === "none") {
    return "No Auth";
  }

  if (value.includes("oauth")) {
    return "OAuth";
  }

  if (value.includes("apikey") || value.includes("api key") || value.includes("key") || value.includes("token")) {
    return "API Key";
  }

  if (value.includes("basic")) {
    return "Basic Auth";
  }

  return "Unknown";
}

function mergeAuth(existing: string, incoming: string): string {
  const rank = new Map<string, number>([
    ["No Auth", 4],
    ["OAuth", 3],
    ["API Key", 2],
    ["Unknown", 1]
  ]);

  return (rank.get(incoming) ?? 0) > (rank.get(existing) ?? 0) ? incoming : existing;
}

function canonicalCors(rawValue: string | undefined): CorsSupport {
  const value = rawValue?.trim().toLowerCase() ?? "";

  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  return "Unknown";
}

function mergeCors(existing: CorsSupport, incoming: CorsSupport): CorsSupport {
  const rank: Record<CorsSupport, number> = {
    Yes: 3,
    No: 2,
    Unknown: 1
  };

  return rank[incoming] > rank[existing] ? incoming : existing;
}

function inferPrimaryCategory(sourceCategories: string[], text: string): string {
  const haystack = `${sourceCategories.join(" ")} ${text}`.toLowerCase();

  for (const rule of PRIMARY_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.title;
    }
  }

  return "Utilities";
}

function inferCapabilities(name: string, description: string, categories: string[]): string[] {
  const haystack = `${name} ${description} ${categories.join(" ")}`.toLowerCase();
  const categoryText = categories.join(" ").toLowerCase();

  const matches = CAPABILITY_RULES.flatMap((rule) => {
    const keywordMatch = rule.keywords.some((keyword) => haystack.includes(keyword));
    const categoryMatch = rule.categoryKeywords?.some((keyword) => categoryText.includes(keyword)) ?? false;

    return keywordMatch || categoryMatch ? [rule.label] : [];
  });

  return unique(matches).sort(compareStrings);
}

function inferProtocols(record: SourceRecord, text: string): string[] {
  const values = new Set<string>();

  const rawType = record.protocolRaw?.toLowerCase() ?? "";
  const haystack = `${rawType} ${text}`.toLowerCase();

  if (haystack.includes("graphql")) {
    values.add("GraphQL");
  }

  if (haystack.includes("websocket") || haystack.includes("ws")) {
    values.add("WebSocket");
  }

  if (haystack.includes("grpc")) {
    values.add("gRPC");
  }

  if (values.size === 0 || haystack.includes("rest")) {
    values.add("REST");
  }

  return [...values];
}

function inferOpenApi(record: SourceRecord, text: string): boolean {
  const specText = `${record.specificationType ?? ""} ${record.specificationUrl ?? ""} ${text}`.toLowerCase();
  return /openapi|swagger/.test(specText);
}

function inferOfficialStatus(name: string, description: string, docsUrl: string): boolean {
  const haystack = `${name} ${description} ${docsUrl}`.toLowerCase();
  if (/unofficial|fan-made|community|alternate/.test(haystack)) {
    return false;
  }

  if (/github\.io|herokuapp\.com/.test(haystack) && /unofficial|random|quotes|facts/.test(haystack)) {
    return false;
  }

  return true;
}

function choosePreferredUrl(existing: string, incoming: string): string {
  const existingHost = normalizeHost(new URL(existing).hostname);
  const incomingHost = normalizeHost(new URL(incoming).hostname);
  const existingGithub = /github/.test(existingHost);
  const incomingGithub = /github/.test(incomingHost);

  if (existingGithub && !incomingGithub) {
    return incoming;
  }

  return existing;
}

function computeWeight(api: ApiEntry): number {
  let weight = 20 + api.sourceLabels.length * 6;

  if (api.primaryCategory === "AI & ML") {
    weight += 24;
  }

  if (api.primaryCategory === "Search & Retrieval") {
    weight += 12;
  }

  if (api.hasOpenApi) {
    weight += 10;
  }

  if (api.isOfficial) {
    weight += 8;
  }

  if (api.authType === "No Auth") {
    weight += 7;
  }

  if (api.https) {
    weight += 4;
  }

  for (const capability of api.capabilities) {
    if (
      capability === "LLM" ||
      capability === "Search" ||
      capability === "Browser Automation" ||
      capability === "Speech to Text" ||
      capability === "Text to Speech" ||
      capability === "OCR" ||
      capability === "Translation"
    ) {
      weight += 5;
    }
  }

  return weight;
}

export function normalizeRecords(records: SourceRecord[]): ApiEntry[] {
  const merged = new Map<string, ApiEntry>();

  for (const record of records) {
    if (!record.isFree) {
      continue;
    }

    const docsUrl = safeUrl(record.docsUrl);
    if (!docsUrl) {
      continue;
    }

    const key = dedupeKey(record);
    const text = `${record.name} ${record.description} ${record.categories.join(" ")}`;
    const existing = merged.get(key);

    if (!existing) {
      const websiteUrl = safeUrl(record.websiteUrl) ?? docsUrl;
      const primaryCategory = inferPrimaryCategory(record.categories, text);
      const capabilities = inferCapabilities(record.name, record.description, record.categories);
      const protocols = inferProtocols(record, text);
      const hasOpenApi = inferOpenApi(record, text);
      const isOfficial = inferOfficialStatus(record.name, record.description, docsUrl);

      const api: ApiEntry = {
        id: key,
        slug: slugify(record.name),
        name: record.name,
        description: record.description,
        docsUrl,
        websiteUrl,
        screenshotTargetUrl: websiteUrl,
        screenshotPath: "",
        domain: extractDomain(websiteUrl),
        primaryCategory,
        sourceCategories: unique(record.categories).sort(compareStrings),
        capabilities,
        authType: canonicalAuth(record.authRaw),
        https: record.https ?? false,
        cors: canonicalCors(record.corsRaw),
        hasOpenApi,
        protocols,
        isOfficial,
        isFree: true,
        sourceRepos: [record.sourceRepo],
        sourceLicenses: [record.sourceLicense],
        sourceLabels: [record.sourceLabel],
        searchText: "",
        weight: 0,
        freshnessScore: 0
      };

      merged.set(key, api);
      continue;
    }

    if (record.description.length > existing.description.length) {
      existing.description = record.description;
    }

    existing.docsUrl = choosePreferredUrl(existing.docsUrl, docsUrl);
    existing.websiteUrl = choosePreferredUrl(existing.websiteUrl, safeUrl(record.websiteUrl) ?? docsUrl);
    existing.screenshotTargetUrl = existing.websiteUrl;
    existing.domain = extractDomain(existing.websiteUrl);
    existing.sourceCategories = unique([...existing.sourceCategories, ...record.categories]).sort(compareStrings);
    existing.authType = mergeAuth(existing.authType, canonicalAuth(record.authRaw));
    existing.https = existing.https || Boolean(record.https);
    existing.cors = mergeCors(existing.cors, canonicalCors(record.corsRaw));
    existing.hasOpenApi = existing.hasOpenApi || inferOpenApi(record, text);
    existing.protocols = unique([...existing.protocols, ...inferProtocols(record, text)]).sort(compareStrings);
    existing.isOfficial = existing.isOfficial && inferOfficialStatus(record.name, record.description, docsUrl);
    existing.sourceRepos = unique([...existing.sourceRepos, record.sourceRepo]).sort(compareStrings);
    existing.sourceLicenses = unique([...existing.sourceLicenses, record.sourceLicense]).sort(compareStrings);
    existing.sourceLabels = unique([...existing.sourceLabels, record.sourceLabel]).sort(compareStrings);
    existing.capabilities = unique([
      ...existing.capabilities,
      ...inferCapabilities(record.name, record.description, record.categories)
    ]).sort(compareStrings);
    existing.primaryCategory = inferPrimaryCategory(existing.sourceCategories, `${existing.name} ${existing.description}`);
  }

  const apis = [...merged.values()]
    .map((api) => {
      api.searchText = [
        api.name,
        api.description,
        api.primaryCategory,
        ...api.sourceCategories,
        ...api.capabilities,
        api.authType,
        api.domain
      ]
        .join(" ")
        .toLowerCase();
      api.freshnessScore = api.sourceLabels.length * 10 + (api.hasOpenApi ? 4 : 0);
      api.weight = computeWeight(api);
      return api;
    })
    .sort((left, right) => right.weight - left.weight || compareStrings(left.name, right.name));

  return apis;
}

function buildTaxonomyPages(
  titleFor: (value: string) => string,
  descriptionFor: (value: string) => string,
  map: Map<string, ApiEntry[]>,
  minimumItems = 1
): TaxonomyPage[] {
  return [...map.entries()]
    .filter(([, apis]) => apis.length >= minimumItems)
    .map(([value, apis]) => ({
      slug: slugify(value),
      title: titleFor(value),
      description: descriptionFor(value),
      count: apis.length,
      apis: [...apis].sort((left, right) => right.weight - left.weight || compareStrings(left.name, right.name))
    }))
    .sort((left, right) => right.count - left.count || compareStrings(left.title, right.title));
}

export function buildSiteData(apis: ApiEntry[], generatedAt: string): SiteData {
  const categoriesMap = new Map<string, ApiEntry[]>();
  const topicsMap = new Map<string, ApiEntry[]>();
  const capabilitiesMap = new Map<string, ApiEntry[]>();

  for (const api of apis) {
    categoriesMap.set(api.primaryCategory, [...(categoriesMap.get(api.primaryCategory) ?? []), api]);
    for (const topic of api.sourceCategories) {
      topicsMap.set(topic, [...(topicsMap.get(topic) ?? []), api]);
    }

    for (const capability of api.capabilities) {
      capabilitiesMap.set(capability, [...(capabilitiesMap.get(capability) ?? []), api]);
    }
  }

  const categories = buildTaxonomyPages(
    (value) => value,
    (value) => PRIMARY_CATEGORY_DESCRIPTIONS[value] ?? "Browse free public APIs in this category.",
    categoriesMap
  );

  const topics = buildTaxonomyPages(
    (value) => value,
    (value) => `Browse free public APIs tagged under ${value}.`,
    topicsMap,
    3
  );

  const capabilityDescriptions = new Map(CAPABILITY_RULES.map((rule) => [rule.label, rule.description]));
  const capabilities = buildTaxonomyPages(
    (value) => value,
    (value) => capabilityDescriptions.get(value) ?? "Browse free public APIs for this capability.",
    capabilitiesMap,
    5
  );

  const collections: CollectionPage[] = COLLECTION_DEFINITIONS.flatMap((definition) => {
    const matches = apis.filter((api) => {
      const capabilityMatch =
        definition.anyCapabilities?.some((value) => api.capabilities.includes(valueFromCapabilitySlug(value))) ??
        false;
      const categoryMatch = definition.categories?.includes(api.primaryCategory) ?? false;
      const hostMatch = definition.docsHostKeywords?.some((keyword) => api.domain.includes(keyword)) ?? false;

      return capabilityMatch || categoryMatch || hostMatch;
    });

    const minimumItems = definition.minItems ?? 1;
    if (matches.length < minimumItems) {
      return [];
    }

    return [
      {
        slug: definition.slug,
        title: definition.title,
        description: definition.description,
        intro: definition.intro,
        apis: matches.slice().sort((left, right) => right.weight - left.weight || compareStrings(left.name, right.name))
      }
    ];
  }).sort((left, right) => right.apis.length - left.apis.length || compareStrings(left.title, right.title));

  const filterOptions = {
    sections: categories.map((category) => category.title),
    categories: topics.map((topic) => topic.title),
    capabilities: capabilities.map((capability) => capability.title),
    authTypes: unique(apis.map((api) => api.authType)).sort(compareStrings)
  };

  return {
    generatedAt,
    apis,
    featuredApis: apis.slice(0, PAGE_SIZE),
    categories,
    topics,
    capabilities,
    collections,
    filterOptions
  };
}

function valueFromCapabilitySlug(slug: string): string {
  return CAPABILITY_RULES.find((rule) => rule.slug === slug)?.label ?? slug;
}
