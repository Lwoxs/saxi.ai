import {
  COMPANY_COUNTRY,
  COMPANY_MANAGING_DIRECTOR,
  COMPANY_NAME,
  COMPANY_POSTAL,
  COMPANY_REGISTER_COURT,
  COMPANY_REGISTER_NUMBER,
  COMPANY_STREET,
  COMPANY_VAT_ID,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_LABEL,
  PAGE_SIZE,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TAGLINE
} from "./constants.js";
import type { ApiEntry, CollectionPage, SiteData, TaxonomyPage } from "./types.js";
import { compareStrings, escapeHtml } from "./utils.js";

interface PageDefinition {
  title: string;
  description: string;
  path: string;
  body: string;
  sidebar?: string;
  structuredData?: unknown[];
  noIndex?: boolean;
}

interface PagerState {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

const SIDEBAR_LINKS = [
  { href: "/apis/", label: "All APIs" },
  { href: "/capability/", label: "Capabilities" },
  { href: "/collections/", label: "Collections" },
  { href: "/category/", label: "Sections" }
];

export function renderDocument(definition: PageDefinition): string {
  const canonicalUrl = `${SITE_ORIGIN}${definition.path}`;
  const title = `${definition.title} | ${SITE_NAME}`;
  const structuredData = definition.structuredData
    ?.map(
      (entry) =>
        `<script type="application/ld+json">${JSON.stringify(entry).replaceAll("</script>", "<\\/script>")}</script>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(definition.description)}" />
    <meta name="theme-color" content="#08111f" />
    ${definition.noIndex ? '<meta name="robots" content="noindex, follow" />' : '<meta name="robots" content="index, follow" />'}
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Sora:wght@400;500;600;700&display=swap" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escapeHtml(definition.title)}" />
    <meta property="og:description" content="${escapeHtml(definition.description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${SITE_ORIGIN}/social-card.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(definition.title)}" />
    <meta name="twitter:description" content="${escapeHtml(definition.description)}" />
    <link rel="stylesheet" href="/assets/app.css" />
    ${structuredData ?? ""}
  </head>
  <body>
    <div class="shell pb-20 pt-6 sm:pt-8">
      <div class="${definition.sidebar ? "site-layout" : ""}">
        ${definition.sidebar ? `<aside class="site-sidebar">${definition.sidebar}</aside>` : ""}
        <div class="site-main">
          ${renderHeader()}
          <main class="shell-grid py-8 sm:py-10">
            ${definition.body}
          </main>
          ${renderFooter()}
        </div>
      </div>
    </div>
    <script src="/assets/app.js" defer></script>
  </body>
</html>`;
}

function renderHeader(): string {
  return `<header class="header-bar">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <a href="/" class="inline-flex items-center text-white">
        <span>
          <span class="block font-sans text-lg font-black uppercase tracking-[-0.02em] sm:text-xl">saxi.ai</span>
          <span class="block font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">free public APIs for AI agents and developers</span>
        </span>
      </a>
      <form action="/apis/" method="get" class="header-search">
        <input
          class="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ink-500"
          type="search"
          name="q"
          placeholder="Search APIs..."
        />
        <button class="header-search-button" type="submit">Go</button>
      </form>
    </div>
  </header>`;
}

function renderFooter(): string {
  return `<footer class="mt-14 border-t border-white/10 pt-8 text-sm text-ink-400">
    <div class="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <div class="max-w-2xl space-y-3">
        <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-500">About</p>
        <p>
          saxi.ai indexes free public APIs from open-source lists and organizes them for AI agents
          and developers. Every entry is free, links to real docs, and is tagged by capability.
        </p>
      </div>
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="space-y-2">
          <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-500">Contact</p>
          <p><a class="eyebrow-link" href="/contact/">Contact page</a></p>
          <p><a class="eyebrow-link" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
        </div>
        <div class="space-y-2 lg:text-right">
          <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-500">Sources</p>
        <p><a class="eyebrow-link" href="https://github.com/public-api-lists/public-api-lists">Public API Lists</a></p>
        <p><a class="eyebrow-link" href="https://github.com/public-apis/public-apis">public-apis/public-apis</a></p>
        <p><a class="eyebrow-link" href="https://github.com/tools-collection/apis-collection">tools-collection/apis-collection</a></p>
        </div>
      </div>
    </div>
  </footer>`;
}

function renderSidebar(site: SiteData, pathname: string): string {
  const browseLinks = SIDEBAR_LINKS.map((item) => {
    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    return `<a href="${item.href}" class="sidebar-link" data-active="${active ? "true" : "false"}">
      <span>${item.label}</span>
    </a>`;
  }).join("");

  const topicLinks = site.topics
    .map((topic) => {
      const href = `/topic/${topic.slug}/`;
      const active = pathname === href;
      return `<a href="${href}" class="sidebar-link" data-active="${active ? "true" : "false"}">
        <span>${escapeHtml(topic.title)}</span>
        <span class="sidebar-count">${topic.count}</span>
      </a>`;
    })
    .join("");

  return `<div class="sidebar-stack">
    <section class="sidebar-panel">
      <p class="sidebar-section-label">Navigate</p>
      <div class="sidebar-list">${browseLinks}</div>
    </section>
    <section class="sidebar-panel">
      <div class="flex items-center justify-between gap-3">
        <p class="sidebar-section-label">Categories</p>
        <a href="/topic/" class="eyebrow-link text-[11px] uppercase tracking-[0.18em]">All</a>
      </div>
      <div class="sidebar-list sidebar-list-scroll">${topicLinks}</div>
    </section>
  </div>`;
}

function renderHero(title: string, eyebrow: string, description: string, actions?: string): string {
  return `<section class="hero-panel">
    <div class="space-y-5">
      <p class="meta-label">${eyebrow}</p>
      <h1 class="max-w-4xl text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-4xl lg:text-[2.75rem]">${title}</h1>
      <p class="max-w-3xl text-sm leading-8 text-ink-300 sm:text-base">${description}</p>
      ${actions ?? ""}
    </div>
  </section>`;
}

function renderSearchHero(site: SiteData): string {
  return `<form action="/apis/" method="get" class="hero-panel">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(250px,0.9fr)] lg:items-end">
      <div class="space-y-5">
        <p class="meta-label">${site.apis.length} free APIs. ${site.topics.length} categories. Open data.</p>
        <h1 class="max-w-4xl text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-4xl lg:text-[2.75rem]">${SITE_TAGLINE}</h1>
        <p class="max-w-3xl text-sm leading-8 text-ink-300 sm:text-base">
          Discover free APIs across AI, search, browser automation, developer tools, messaging, maps, payments, and infrastructure.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="hero-stat">
          <span class="meta-label">APIs</span>
          <strong>${site.apis.length}</strong>
        </div>
        <div class="hero-stat">
          <span class="meta-label">Categories</span>
          <strong>${site.topics.length}</strong>
        </div>
        <div class="hero-stat">
          <span class="meta-label">Capabilities</span>
          <strong>${site.capabilities.length}</strong>
        </div>
        <div class="hero-stat">
          <span class="meta-label">Collections</span>
          <strong>${site.collections.length}</strong>
        </div>
      </div>
    </div>
  </form>`;
}

function renderSponsoredBanner(): string {
  return `<section class="sponsor-banner" aria-label="Sponsored banner">
    <div class="sponsor-grid">
      <div class="space-y-5">
        <div class="flex flex-wrap items-center gap-3">
          <span class="sponsor-label">Sponsored</span>
          <span class="badge">Adanos Software</span>
        </div>
        <div class="space-y-3">
          <h2 class="text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-[2.35rem]">Market sentiment API for stocks and crypto.</h2>
          <p class="max-w-3xl text-sm leading-8 text-ink-300 sm:text-base">
            Real-time sentiment and attention data from Reddit, X, financial news, Polymarket and crypto communities,
            unified into a developer-first API for trading tools, quant workflows and AI agents.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="badge">Market Data</span>
          <span class="badge">REST API</span>
          <span class="badge">JSON</span>
          <span class="badge">AI Agents</span>
          <span class="badge">CLI</span>
        </div>
        <div class="flex flex-wrap gap-3">
          <a href="https://adanos.org/" target="_blank" rel="noreferrer" class="button-primary">Visit Adanos</a>
          <a href="https://api.adanos.org/" target="_blank" rel="noreferrer" class="button-secondary">API Docs</a>
        </div>
      </div>
      <div class="sponsor-code">
<pre><code>{
  "ticker": "NVDA",
  "buzz_score": 79.4,
  "trend": "rising",
  "mentions": 3689,
  "sentiment_score": 0.64,
  "bullish_pct": 58,
  "bearish_pct": 14
}</code></pre>
        <p class="sponsor-code-caption">Structured sentiment signals for apps, dashboards and LLM tool use.</p>
      </div>
    </div>
  </section>`;
}

function renderSectionTitle(title: string, description: string, href?: string): string {
  return `<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div class="space-y-2">
      <p class="meta-label">Section</p>
      <h2 class="section-title">${title}</h2>
      <p class="section-copy">${description}</p>
    </div>
    ${href ? `<a href="${href}" class="button-secondary">View all</a>` : ""}
  </div>`;
}

function renderTaxonomyTiles(items: Array<{ href: string; title: string; description: string; count: number }>): string {
  return `<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${items
    .map(
      (item) => `<a href="${item.href}" class="glass-tile group">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold text-white">${escapeHtml(item.title)}</h3>
          <span class="badge">${item.count} APIs</span>
        </div>
        <p class="mt-3 text-sm leading-7 text-ink-300">${escapeHtml(item.description)}</p>
      </a>`
    )
    .join("")}</div>`;
}

function renderApiCard(api: ApiEntry): string {
  const capabilities = api.capabilities.slice(0, 4).map((capability) => `<span class="badge">${escapeHtml(capability)}</span>`).join("");
  const badges = [
    api.authType,
    api.https ? "HTTPS" : "HTTP",
    `CORS ${api.cors}`,
    api.isOfficial ? "Official" : "Unofficial",
    api.hasOpenApi ? "OpenAPI" : ""
  ]
    .filter(Boolean)
    .map((value) => `<span class="badge">${escapeHtml(value)}</span>`)
    .join("");

  return `<article
    class="api-card"
    data-api-card
    data-name="${escapeHtml(api.name)}"
    data-search="${escapeHtml(api.searchText)}"
    data-section="${escapeHtml(api.primaryCategory)}"
    data-category="${escapeHtml(api.primaryCategory)}"
    data-categories="${escapeHtml(api.sourceCategories.join("|"))}"
    data-capabilities="${escapeHtml(api.capabilities.join("|"))}"
    data-auth="${escapeHtml(api.authType)}"
    data-official="${api.isOfficial ? "yes" : "no"}"
    data-openapi="${api.hasOpenApi ? "yes" : "no"}"
    data-weight="${api.weight}"
    data-score="${api.freshnessScore}"
  >
    <a href="${api.docsUrl}" target="_blank" rel="noreferrer" class="api-card-link" aria-label="${escapeHtml(api.name)} documentation">
      <div class="api-card-media">
        <img
          src="${api.screenshotPath}"
          alt="${escapeHtml(api.name)} documentation page"
          width="400"
          height="192"
          loading="lazy"
          decoding="async"
          class="api-card-image"
        />
      </div>
      <div class="api-card-body">
        <div class="flex flex-wrap gap-2">
          <span class="badge">${escapeHtml(api.primaryCategory)}</span>
          ${capabilities}
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-xl font-semibold tracking-tight text-white">${escapeHtml(api.name)}</h3>
            <span class="font-mono text-xs uppercase tracking-[0.18em] text-ink-500">${escapeHtml(api.domain)}</span>
          </div>
          <p class="text-sm leading-7 text-ink-300">${escapeHtml(api.description)}</p>
        </div>
        <div class="mt-auto flex flex-wrap gap-2">${badges}</div>
      </div>
    </a>
  </article>`;
}

function renderApiGrid(apis: ApiEntry[]): string {
  return `<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-results-grid>${apis
    .map((api) => renderApiCard(api))
    .join("")}</div>`;
}

function renderArchivePager(state: PagerState): string {
  if (state.totalPages <= 1) {
    return "";
  }

  const pages = Array.from({ length: state.totalPages }, (_, index) => index + 1);
  const visible = new Set<number>([1, state.totalPages]);
  for (let offset = -1; offset <= 1; offset++) {
    const page = state.currentPage + offset;
    if (page >= 1 && page <= state.totalPages) {
      visible.add(page);
    }
  }

  const items: string[] = [];
  let lastRendered = 0;
  for (const page of pages) {
    if (!visible.has(page)) {
      continue;
    }
    if (lastRendered > 0 && page - lastRendered > 1) {
      items.push(`<span class="nav-pill pointer-events-none text-ink-500">&hellip;</span>`);
    }
    const href = page === 1 ? state.basePath : `${state.basePath}page/${page}/`;
    const active = page === state.currentPage;
    items.push(`<a href="${href}" class="nav-pill" data-active="${active ? "true" : "false"}">${page}</a>`);
    lastRendered = page;
  }

  return `<div class="flex flex-wrap gap-2">${items.join("")}</div>`;
}

function renderAllApisFilters(site: SiteData): string {
  const option = (value: string) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;

  return `<form class="filter-panel" data-filter-form>
    <div class="space-y-2">
      <input class="filter-input" type="search" name="q" placeholder="Search APIs, docs, or capabilities..." data-search-input />
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <select class="filter-input" name="category" aria-label="Category">
        <option value="">All categories</option>
        ${site.filterOptions.categories.map(option).join("")}
      </select>
      <select class="filter-input" name="section" aria-label="Section">
        <option value="">All sections</option>
        ${site.filterOptions.sections.map(option).join("")}
      </select>
      <select class="filter-input" name="capability" aria-label="Capability">
        <option value="">All capabilities</option>
        ${site.filterOptions.capabilities.map(option).join("")}
      </select>
      <select class="filter-input" name="auth" aria-label="Auth type">
        <option value="">Any auth</option>
        ${site.filterOptions.authTypes.map(option).join("")}
      </select>
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
      <select class="filter-input" name="official" aria-label="Official status">
        <option value="">Official + unofficial</option>
        <option value="yes">Official only</option>
        <option value="no">Unofficial only</option>
      </select>
      <select class="filter-input" name="openapi" aria-label="OpenAPI spec">
        <option value="">Any spec state</option>
        <option value="yes">OpenAPI available</option>
        <option value="no">No OpenAPI spec</option>
      </select>
      <select class="filter-input" name="sort" data-sort-select aria-label="Sort order">
        <option value="relevance">Best match</option>
        <option value="alphabetical">Alphabetical</option>
        <option value="freshness">Source confidence</option>
      </select>
    </div>
  </form>`;
}

function renderBreadcrumb(items: Array<{ href: string; label: string }>): string {
  return `<nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-2 text-sm text-ink-400">
    ${items
      .map(
        (item, index) =>
          `${index > 0 ? '<span class="text-ink-600">/</span>' : ""}<a href="${item.href}" class="eyebrow-link">${escapeHtml(item.label)}</a>`
      )
      .join("")}
  </nav>`;
}

function breadcrumbSchema(items: Array<{ href: string; label: string }>): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${SITE_ORIGIN}${item.href}`
    }))
  };
}

export function renderHomePage(site: SiteData): string {
  const capabilityTiles = site.capabilities.slice(0, 9).map((capability) => ({
    href: `/capability/${capability.slug}/`,
    title: capability.title,
    description: capability.description,
    count: capability.count
  }));

  const collectionTiles = site.collections.map((collection) => ({
    href: `/collections/${collection.slug}/`,
    title: collection.title,
    description: collection.description,
    count: collection.apis.length
  }));

  return renderDocument({
    title: "Free Public API Directory for AI Agents and Developers",
    description:
      "Browse free public APIs across AI, browser automation, search, speech, developer tools, messaging, maps, and infrastructure.",
    path: "/",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_ORIGIN,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_ORIGIN}/apis/?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_ORIGIN,
        contactPoint: {
          "@type": "ContactPoint",
          email: CONTACT_EMAIL,
          contactType: "customer support"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Featured Free APIs",
        numberOfItems: Math.min(site.featuredApis.length, 9),
        itemListElement: site.featuredApis.slice(0, 9).map((api, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: api.name,
          url: api.docsUrl
        }))
      }
    ],
    sidebar: renderSidebar(site, "/"),
    body: [
      renderSearchHero(site),
      renderSponsoredBanner(),
      `<section class="space-y-5">
        ${renderSectionTitle("Featured APIs", "The most useful free APIs for building with AI, sorted by documentation quality, protocol support, and real-world utility.", "/apis/")}
        ${renderApiGrid(site.featuredApis.slice(0, 9))}
      </section>`,
      `<section class="space-y-5">
        ${renderSectionTitle("Collections", "Hand-picked groups of APIs for common tasks — from browser automation and RAG pipelines to translation and speech.", "/collections/")}
        ${renderTaxonomyTiles(collectionTiles)}
      </section>`,
      `<section class="space-y-5">
        ${renderSectionTitle("Top Capabilities", "Find APIs by what they do — search, code execution, OCR, geocoding, and more.", "/capability/")}
        ${renderTaxonomyTiles(capabilityTiles)}
      </section>`
    ].join("")
  });
}

export function renderApisLandingPage(site: SiteData, pager: PagerState): string {
  const archiveSummary = `<div class="flex flex-wrap items-center justify-between gap-4">
    <div class="space-y-1">
      <p class="meta-label">Pages</p>
      <p class="text-sm text-ink-300">
        Browse all APIs page by page, or use the filters above to narrow down.
      </p>
    </div>
    ${renderArchivePager(pager)}
  </div>`;

  return renderDocument({
    title: "All Free APIs",
    description:
      "Search and filter the saxi.ai directory of free public APIs for AI agents and developers.",
    path: "/apis/",
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: "/apis/", label: "All APIs" }
      ]),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "All Free APIs",
        description:
          "Search and filter the saxi.ai directory of free public APIs for AI agents and developers.",
        url: `${SITE_ORIGIN}/apis/`
      }
    ],
    sidebar: renderSidebar(site, "/apis/"),
    body: [
      renderHero(
        "Search the full free API directory",
        "All APIs",
        "Filter by category, capability, auth type, or just search. Every API is free and links directly to its documentation."
      ),
      `<section class="space-y-6">
        ${renderAllApisFilters(site)}
        <div class="space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
              <p class="meta-label">Results</p>
              <h2 class="text-2xl font-bold tracking-tight text-white">Free APIs for AI agents and developers</h2>
            </div>
            <p class="badge" data-results-count>${site.apis.length} APIs</p>
          </div>
          <p class="text-xs text-ink-500">Filters update the URL — bookmark or share any search.</p>
          <div data-search-index="/search-index.json">
            ${renderApiGrid(site.apis.slice(0, PAGE_SIZE))}
          </div>
          ${archiveSummary}
        </div>
      </section>`
    ].join("")
  });
}

export function renderApisArchivePage(site: SiteData, apis: ApiEntry[], pager: PagerState): string {
  const path = pager.currentPage === 1 ? "/apis/" : `/apis/page/${pager.currentPage}/`;
  const title = pager.currentPage === 1 ? "All Free APIs" : `All Free APIs - Page ${pager.currentPage}`;

  return renderDocument({
    title,
    description:
      "Browse the crawlable archive of free public APIs for AI agents and developers.",
    path,
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: "/apis/", label: "All APIs" }
      ])
    ],
    sidebar: renderSidebar(site, path),
    body: [
      renderBreadcrumb([
        { href: "/", label: "Home" },
        { href: "/apis/", label: "All APIs" }
      ]),
      renderHero(
        pager.currentPage === 1 ? "All APIs" : `All APIs — page ${pager.currentPage}`,
        "Archive",
        "The complete list of free public APIs in the directory. Use the main search page for filtering and sorting."
      ),
      `<section class="space-y-5">
        ${renderApiGrid(apis)}
        ${renderArchivePager(pager)}
      </section>`
    ].join("")
  });
}

export function renderTaxonomyIndexPage(
  site: SiteData,
  title: string,
  description: string,
  path: string,
  items: Array<{ href: string; title: string; description: string; count: number }>
): string {
  return renderDocument({
    title,
    description,
    path,
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: path, label: title }
      ]),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${SITE_ORIGIN}${path}`
      }
    ],
    sidebar: renderSidebar(site, path),
    body: [
      renderHero(title, "Index", description),
      `<section class="space-y-5">${renderTaxonomyTiles(items)}</section>`
    ].join("")
  });
}

export function renderTopicPage(site: SiteData, topic: TaxonomyPage): string {
  const path = `/topic/${topic.slug}/`;
  return renderDocument({
    title: `${topic.title} APIs`,
    description: topic.description,
    path,
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: "/topic/", label: "Categories" },
        { href: path, label: `${topic.title} APIs` }
      ]),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${topic.title} APIs`,
        description: topic.description,
        url: `${SITE_ORIGIN}${path}`
      }
    ],
    sidebar: renderSidebar(site, path),
    body: renderTaxonomyBody(topic, path, { href: "/topic/", label: "Categories" }, "Category", "/apis/", {
      name: "category",
      value: topic.title
    })
  });
}

function renderTaxonomyBody(
  item: TaxonomyPage | CollectionPage,
  pathname: string,
  parent: { href: string; label: string },
  eyebrow: string,
  browseLink: string,
  searchFilter?: { name: string; value: string }
): string {
  const breadcrumb = [
    { href: "/", label: "Home" },
    parent,
    { href: pathname, label: item.title }
  ];

  const allApisLink = searchFilter
    ? `${browseLink}?${searchFilter.name}=${encodeURIComponent(searchFilter.value)}`
    : browseLink;

  return [
    renderBreadcrumb(breadcrumb),
    renderHero(item.title, eyebrow, item.description),
    `<section class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <p class="meta-label">Directory slice</p>
          <h2 class="text-2xl font-bold tracking-tight text-white">${item.apis.length} APIs</h2>
        </div>
        <a href="${allApisLink}" class="button-secondary">Open in all APIs search</a>
      </div>
      ${"intro" in item ? `<div class="glass-callout">${escapeHtml(item.intro)}</div>` : ""}
      ${renderApiGrid(item.apis)}
    </section>`
  ].join("");
}

export function renderCategoryPage(site: SiteData, category: TaxonomyPage): string {
  const path = `/category/${category.slug}/`;
  return renderDocument({
    title: `${category.title} APIs`,
    description: category.description,
    path,
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: "/category/", label: "Sections" },
        { href: path, label: `${category.title} APIs` }
      ]),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${category.title} APIs`,
        description: category.description,
        url: `${SITE_ORIGIN}${path}`
      }
    ],
    sidebar: renderSidebar(site, path),
    body: renderTaxonomyBody(category, path, { href: "/category/", label: "Sections" }, "Section", "/apis/", {
      name: "section",
      value: category.title
    })
  });
}

export function renderCapabilityPage(site: SiteData, capability: TaxonomyPage): string {
  const path = `/capability/${capability.slug}/`;
  return renderDocument({
    title: `${capability.title} APIs`,
    description: capability.description,
    path,
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: "/capability/", label: "Capabilities" },
        { href: path, label: `${capability.title} APIs` }
      ]),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${capability.title} APIs`,
        description: capability.description,
        url: `${SITE_ORIGIN}${path}`
      }
    ],
    sidebar: renderSidebar(site, path),
    body: renderTaxonomyBody(capability, path, { href: "/capability/", label: "Capabilities" }, "Capability", "/apis/", {
      name: "capability",
      value: capability.title
    })
  });
}

export function renderCollectionPage(site: SiteData, collection: CollectionPage): string {
  const path = `/collections/${collection.slug}/`;
  return renderDocument({
    title: collection.title,
    description: collection.description,
    path,
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: "/collections/", label: "Collections" },
        { href: path, label: collection.title }
      ]),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: collection.title,
        description: collection.description,
        url: `${SITE_ORIGIN}${path}`
      }
    ],
    sidebar: renderSidebar(site, path),
    body: renderTaxonomyBody(collection, path, { href: "/collections/", label: "Collections" }, "Collection", "/apis/")
  });
}

export function renderContactPage(site: SiteData): string {
  return renderDocument({
    title: "Contact & Imprint",
    description: "Contact and legal company information for the saxi.ai project.",
    path: "/contact/",
    structuredData: [
      breadcrumbSchema([
        { href: "/", label: "Home" },
        { href: "/contact/", label: "Contact" }
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: COMPANY_NAME,
        url: SITE_ORIGIN,
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE,
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY_STREET,
          postalCode: "10407",
          addressLocality: "Berlin",
          addressCountry: COMPANY_COUNTRY
        }
      }
    ],
    sidebar: renderSidebar(site, "/contact/"),
    body: [
      renderHero(
        "Contact & Imprint",
        "Contact",
        "saxi.ai is operated by Adanos Software GmbH. Reach out for corrections, broken links, partnership requests, or legal inquiries."
      ),
      `<section class="grid gap-5 xl:grid-cols-2">
        <article class="hero-note px-6 py-6 sm:px-8 sm:py-8">
          <div class="space-y-5">
            <div>
              <p class="meta-label">Primary contact</p>
              <a href="mailto:${CONTACT_EMAIL}" class="mt-2 inline-block text-2xl font-semibold tracking-tight text-white">${CONTACT_EMAIL}</a>
            </div>
            <div>
              <p class="meta-label">Phone</p>
              <a href="tel:${CONTACT_PHONE}" class="mt-2 inline-block text-xl font-semibold tracking-tight text-white">${CONTACT_PHONE_LABEL}</a>
              <p class="mt-2 text-sm leading-7 text-ink-300">Business line only. No product support by phone.</p>
            </div>
            <p class="text-sm leading-7 text-ink-300">
              Please include enough context if you are reporting a broken source, outdated docs URL, category issue, or partnership request.
            </p>
          </div>
        </article>
        <article class="hero-note px-6 py-6 sm:px-8 sm:py-8">
          <div class="space-y-5">
            <div>
              <p class="meta-label">Company</p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">${COMPANY_NAME}</h2>
            </div>
            <div class="space-y-1 text-sm leading-7 text-ink-300">
              <p>${COMPANY_STREET}</p>
              <p>${COMPANY_POSTAL}</p>
              <p>${COMPANY_COUNTRY}</p>
            </div>
            <div class="space-y-1 text-sm leading-7 text-ink-300">
              <p><span class="text-white">Managing Director:</span> ${COMPANY_MANAGING_DIRECTOR}</p>
              <p><span class="text-white">Responsible for content:</span> ${COMPANY_MANAGING_DIRECTOR}</p>
            </div>
          </div>
        </article>
      </section>`,
      `<section class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article class="glass-tile space-y-4">
          <div>
            <p class="meta-label">Registration</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">Legal company details</h2>
          </div>
          <div class="space-y-2 text-sm leading-7 text-ink-300">
            <p><span class="text-white">Registered at:</span> ${COMPANY_REGISTER_COURT}</p>
            <p><span class="text-white">Registration number:</span> ${COMPANY_REGISTER_NUMBER}</p>
            <p><span class="text-white">VAT ID:</span> ${COMPANY_VAT_ID}</p>
          </div>
        </article>
        <article class="glass-tile space-y-4">
          <div>
            <p class="meta-label">Dispute resolution</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">Consumer arbitration</h2>
          </div>
          <p class="text-sm leading-7 text-ink-300">
            Adanos Software GmbH does not participate in consumer arbitration proceedings and is not obliged to do so.
          </p>
          <p class="text-sm leading-7 text-ink-300">
            EU online dispute resolution platform:
            <a class="eyebrow-link" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>
          </p>
        </article>
      </section>`
    ].join("")
  });
}

export function renderNotFoundPage(): string {
  return renderDocument({
    title: "Page not found",
    description: "The page you requested does not exist in the saxi.ai directory.",
    path: "/404.html",
    noIndex: true,
    body: `<section class="hero-note max-w-3xl px-6 py-8 sm:px-8 sm:py-10">
      <p class="meta-label">404</p>
      <h1 class="mt-4 text-4xl font-bold tracking-tight text-white">This route does not exist.</h1>
      <p class="mt-4 max-w-2xl text-base leading-8 text-ink-300">
        Use the directory homepage or the full API search to get back to a valid section of saxi.ai.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="/" class="button-secondary">Go home</a>
        <a href="/apis/" class="button-secondary">Open all APIs</a>
      </div>
    </section>`
  });
}

export function renderSearchIndex(site: SiteData): string {
  return JSON.stringify(
    {
      generatedAt: site.generatedAt,
      total: site.apis.length,
      apis: site.apis.map((api) => ({
        name: api.name,
        description: api.description,
        docsUrl: api.docsUrl,
        screenshotPath: api.screenshotPath,
        primaryCategory: api.primaryCategory,
        sourceCategories: api.sourceCategories,
        capabilities: api.capabilities,
        authType: api.authType,
        https: api.https,
        cors: api.cors,
        isOfficial: api.isOfficial,
        hasOpenApi: api.hasOpenApi,
        domain: api.domain,
        searchText: api.searchText,
        weight: api.weight,
        freshnessScore: api.freshnessScore
      }))
    },
    null,
    2
  );
}

export function renderRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
}

export function renderLlmTxt(site: SiteData): string {
  const topTopics = site.topics.slice(0, 20).map((topic) => `- ${topic.title}: ${SITE_ORIGIN}/topic/${topic.slug}/`);
  const topCapabilities = site.capabilities
    .slice(0, 12)
    .map((capability) => `- ${capability.title}: ${SITE_ORIGIN}/capability/${capability.slug}/`);
  const collections = site.collections.map((collection) => `- ${collection.title}: ${SITE_ORIGIN}/collections/${collection.slug}/`);

  return [
    `site: ${SITE_NAME}`,
    `url: ${SITE_ORIGIN}`,
    `description: Free public API directory for AI agents and developers.`,
    `contact: ${CONTACT_EMAIL}`,
    `sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    `robots: ${SITE_ORIGIN}/robots.txt`,
    `search_index: ${SITE_ORIGIN}/search-index.json`,
    "",
    "overview:",
    "- saxi.ai aggregates public API repositories and normalizes them into a crawlable directory.",
    "- V1 focuses on free public APIs only.",
    "- Prefer canonical HTML pages for browsing and citation; use the JSON search index for machine-assisted filtering.",
    "",
    "key_pages:",
    `- Home: ${SITE_ORIGIN}/`,
    `- All APIs: ${SITE_ORIGIN}/apis/`,
    `- Categories: ${SITE_ORIGIN}/topic/`,
    `- Sections: ${SITE_ORIGIN}/category/`,
    `- Capabilities: ${SITE_ORIGIN}/capability/`,
    `- Collections: ${SITE_ORIGIN}/collections/`,
    `- Contact: ${SITE_ORIGIN}/contact/`,
    "",
    "top_categories:",
    ...topTopics,
    "",
    "top_capabilities:",
    ...topCapabilities,
    "",
    "collections:",
    ...collections
  ].join("\n");
}

export function renderSitemapXml(paths: string[], generatedAt: string): string {
  const lastmod = generatedAt.split("T")[0];
  const urls = paths
    .sort(compareStrings)
    .map(
      (path) => `<url>
  <loc>${SITE_ORIGIN}${path}</loc>
  <lastmod>${lastmod}</lastmod>
</url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function renderFaviconSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="32" fill="#07101A" />
  <rect x="10" y="10" width="108" height="108" rx="26" fill="#151922" stroke="rgba(255,255,255,0.12)" />
  <path d="M42 36H84L63 61L87 92H43L64 67L42 36Z" fill="#B8E9FF" fill-opacity="0.96" />
  <path d="M49 31H92" stroke="#89C2FF" stroke-opacity="0.7" stroke-width="2.5" stroke-linecap="round" />
</svg>`;
}

export function renderSocialCardSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" rx="48" fill="#06101A" />
  <rect x="52" y="52" width="1096" height="526" rx="38" fill="#11141A" stroke="rgba(255,255,255,0.12)" />
  <rect x="84" y="84" width="1032" height="462" rx="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
  <path d="M132 140H242" stroke="#89C2FF" stroke-opacity="0.6" stroke-width="2.5" stroke-linecap="round" />
  <text x="132" y="188" fill="#B8E9FF" font-family="'IBM Plex Mono', monospace" font-size="28" letter-spacing="5">SAXI.AI</text>
  <text x="132" y="286" fill="#F5F8FC" font-family="'Sora', sans-serif" font-size="72" font-weight="600">The API directory for</text>
  <text x="132" y="372" fill="#F5F8FC" font-family="'Sora', sans-serif" font-size="72" font-weight="600">AI agents and developers.</text>
  <text x="132" y="468" fill="#9BADC3" font-family="'Sora', sans-serif" font-size="34">Free public APIs. Build-time rendered. Searchable. Cloudflare-ready.</text>
</svg>`;
}
