export type CorsSupport = "Yes" | "No" | "Unknown";

export interface SourceDefinition {
  id: string;
  label: string;
  repoUrl: string;
  license: string;
  dataUrl: string;
}

export interface SourceRecord {
  sourceId: string;
  sourceLabel: string;
  sourceRepo: string;
  sourceLicense: string;
  name: string;
  description: string;
  docsUrl: string;
  websiteUrl: string;
  categories: string[];
  authRaw?: string;
  https?: boolean;
  corsRaw?: string;
  isFree: boolean;
  addedAt?: string;
  protocolRaw?: string;
  specificationUrl?: string;
  specificationType?: string;
}

export interface ApiEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  docsUrl: string;
  websiteUrl: string;
  screenshotTargetUrl: string;
  screenshotPath: string;
  domain: string;
  primaryCategory: string;
  sourceCategories: string[];
  capabilities: string[];
  authType: string;
  https: boolean;
  cors: CorsSupport;
  hasOpenApi: boolean;
  protocols: string[];
  isOfficial: boolean;
  isFree: boolean;
  sourceRepos: string[];
  sourceLicenses: string[];
  sourceLabels: string[];
  searchText: string;
  weight: number;
  freshnessScore: number;
  addedAt?: string;
}

export interface TaxonomyPage {
  kind: "category" | "topic" | "capability";
  slug: string;
  title: string;
  description: string;
  intro: string;
  editorialSections: string[];
  count: number;
  apis: ApiEntry[];
}

export interface CollectionPage {
  slug: string;
  title: string;
  description: string;
  intro: string;
  editorialSections: string[];
  apis: ApiEntry[];
}

export interface FilterOptions {
  sections: string[];
  categories: string[];
  capabilities: string[];
  authTypes: string[];
}

export interface SiteData {
  generatedAt: string;
  apis: ApiEntry[];
  featuredApis: ApiEntry[];
  newestApis: ApiEntry[];
  categories: TaxonomyPage[];
  topics: TaxonomyPage[];
  capabilities: TaxonomyPage[];
  collections: CollectionPage[];
  filterOptions: FilterOptions;
}

export interface CapabilityRule {
  slug: string;
  label: string;
  description: string;
  keywords: string[];
  categoryKeywords?: string[];
}

export interface CollectionDefinition {
  slug: string;
  title: string;
  description: string;
  intro: string;
  editorialSections: string[];
  anyCapabilities?: string[];
  categories?: string[];
  docsHostKeywords?: string[];
  minItems?: number;
  legacyPaths?: string[];
}
