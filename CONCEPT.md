# saxi.ai V1 Concept

## Positioning

`saxi.ai` is a broad public API directory with a strong AI and agent focus.

It should not try to compete as a generic API list only. Its differentiation is:

- strong discoverability for APIs useful to AI tools and agents
- machine-friendly categorization and filtering
- modern developer-first presentation
- static, crawlable pages with excellent SEO

Core positioning:

> The API directory for AI agents and developers.

## Confirmed V1 Decisions

- broad coverage, with strong AI focus
- English-only
- official and unofficial APIs are allowed
- free/public APIs only in V1
- no user submissions in V1
- maximize coverage over heavy editorial curation
- no individual API detail pages in V1
- real website screenshots for entries
- pages should be fully rendered at build time
- GitHub Actions should drive the build/deploy workflow
- V1 is a directory, not a public data API product

## Product Goals

- Make it fast to discover useful APIs by category, capability, and constraints
- Be indexable and rankable for category and niche search terms
- Build on public repositories first, then evolve into an original dataset later
- Keep runtime infrastructure simple: Cloudflare Worker plus static assets
- Keep dependencies low: Tailwind CSS, small build tooling, minimal client JS

## Non-Goals For V1

- user accounts
- submissions or moderation workflows
- paid API cataloging
- individual API detail pages
- complex server-side search infrastructure
- monetization features

## Information Architecture

V1 should use landing pages, not detail pages.

Primary page types:

- Home
- All APIs
- Category pages
- Capability pages
- Curated collection pages
- Contact

Recommended URL structure:

- `/`
- `/apis/`
- `/category/{slug}/`
- `/capability/{slug}/`
- `/collections/{slug}/`
- `/contact/`

Because V1 has no detail pages, SEO needs to come from many high-quality landing pages.
That means category and capability pages cannot be thin archives. Each page needs:

- unique title
- unique meta description
- short intro copy
- internal links to related pages
- visible crawlable API cards

## Taxonomy Strategy

Use layered taxonomy instead of a single category field.

### 1. Primary Category

Normalized top-level categories for browsing:

- AI & ML
- Developer Tools
- Search & Retrieval
- Data & Analytics
- Communication
- Productivity
- Media
- Security
- Finance
- Commerce
- Maps & Mobility
- Cloud & Infrastructure
- Knowledge & Open Data
- Identity & Auth
- Utilities

### 2. Agent Capability Tags

These are the most important differentiator for `saxi.ai`.

Suggested capability tags:

- LLM
- Chat
- Embeddings
- Reranking
- Search
- Web Search
- Browser Automation
- Scraping
- OCR
- Vision
- Image Generation
- Speech-to-Text
- Text-to-Speech
- Translation
- Summarization
- Code Execution
- Email
- Messaging
- Scheduling
- Payments
- Geocoding
- Observability
- Memory & Storage

### 3. Operational Facets

Used for filtering:

- Free
- No Auth
- API Key
- OAuth
- HTTPS
- CORS Yes
- OpenAPI
- GraphQL
- Webhooks
- Streaming
- Official
- Unofficial

### 4. Source Categories

Preserve original upstream categories internally for traceability, but do not expose them as the main navigation model.

## UX Concept

The design should feel modern and developer-native, not generic startup SaaS.

Visual direction:

- dark-neutral base with sharp contrast and restrained accent colors
- editorial typography for headings, mono accents for metadata
- strong cards with docs-like density
- filters that feel like IDE facets, not e-commerce pills
- tasteful motion only for search, hover, and page reveals

Homepage sections:

- hero with direct search
- featured AI/agent API collections
- top capabilities
- top categories
- latest added or recently refreshed APIs
- contact CTA

Listing page layout:

- search input at top
- sticky left filter rail on desktop
- filter drawer on mobile
- card grid or compact two-column list
- sort by relevance, alphabetical, newest ingested

API card fields in V1:

- name
- short description
- primary category
- capability tags
- auth badge
- HTTPS badge
- CORS badge
- official/unofficial badge
- screenshot
- docs link

## SEO Strategy

V1 SEO should rely on pre-rendered landing pages, not client-rendered search results.

### Core principles

- generate static HTML for every indexable page
- avoid SPA-only rendering
- use normal anchor links for crawlability
- make search and filters progressive enhancement, not the primary URL structure

### Indexable page set

Generate these pages at build time:

- home
- all APIs with pagination
- every primary category page
- every capability page
- selected category + capability combination pages
- selected editorial collection pages
- contact

Do not generate every possible filter combination. That creates thin or duplicate pages.

Instead, pre-render only combinations with clear search intent, for example:

- `/collections/free-apis-for-ai-agents/`
- `/collections/browser-automation-apis/`
- `/collections/speech-to-text-apis/`
- `/collections/search-and-rag-apis/`
- `/collections/openapi-first-apis/`
- `/collections/free-llm-apis/`

### SEO reality check

Without per-API detail pages, long-tail SEO will be weaker than it could be.
V1 can still perform well if category, capability, and collection pages are strong.
The next major SEO unlock after V1 is individual API pages.

### On-page SEO requirements

Every indexable page should include:

- unique title tag
- unique meta description
- H1 that matches search intent
- 100-300 words of unique intro copy
- internal links to adjacent categories/capabilities
- canonical URL
- Open Graph tags
- breadcrumb markup where relevant

### Structured data

Keep it simple and valid:

- `Organization`
- `WebSite`
- `BreadcrumbList`
- `CollectionPage`
- `ItemList`

### Technical SEO

- static `sitemap.xml`
- image sitemap if screenshots become important enough
- `robots.txt`
- clean trailing slash policy
- fast edge delivery from Cloudflare
- compressed HTML, CSS, JSON, and images

## Data Sources For V1

Recommended import sources:

- `public-api-lists/public-api-lists` as primary broad free/public source
- `public-apis/public-apis` for coverage backfill
- `APIs-guru/openapi-directory` for OpenAPI enrichment
- `tools-collection/apis-collection` for extra metadata and AI-oriented entries

Use these only as reference or QA, not as import sources:

- `n0shake/Public-APIs` because of non-commercial license constraints
- smaller curated repos unless they add unique coverage

## Data Model

Each normalized API entry should include:

- `id`
- `slug`
- `name`
- `description`
- `docsUrl`
- `websiteUrl`
- `screenshotTargetUrl`
- `primaryCategory`
- `capabilities[]`
- `sourceCategories[]`
- `authType`
- `https`
- `cors`
- `hasOpenApi`
- `protocols[]`
- `isOfficial`
- `isFree`
- `sourceRepos[]`
- `sourceLicense[]`
- `keywords[]`
- `searchText`
- `screenshotPath`
- `status`

Optional enrichment fields:

- `provider`
- `sdkLinks[]`
- `githubRepo`
- `openApiUrl`

## Normalization Pipeline

Build pipeline:

1. Fetch upstream sources
2. Parse raw formats
3. Normalize into a single schema
4. Deduplicate entries
5. Infer categories and capabilities
6. Validate URLs and required fields
7. Resolve screenshot targets
8. Generate search index
9. Render static pages
10. Deploy to Cloudflare

### Deduplication rules

Primary signals:

- normalized docs domain
- normalized API/provider name
- website/docs URL overlap

When duplicates exist:

- prefer entry with richer description
- prefer entry with OpenAPI link
- merge source metadata
- keep all source repo references internally

## Search And Filtering

Search should feel immediate, but the SEO surface should still be page-based.

Recommended V1 behavior:

- static category/capability/collection pages are indexable
- on-page search filters results client-side
- URL query params preserve state for sharing
- search page itself is useful for users but not treated as the main SEO target

Because dataset size is likely in the low thousands, V1 does not need Algolia or a database.
Use a prebuilt JSON search index and a small vanilla TypeScript search module.

Recommended filters:

- category
- capability
- auth type
- official/unofficial
- OpenAPI available
- CORS
- HTTPS

Recommended sort options:

- relevance
- alphabetical
- newest ingested

## Screenshot Strategy

Use real website screenshots for cards, but do not make screenshot capture part of the public browsing path.

Recommended V1 approach:

- capture screenshots at build time or pre-deploy time
- store them as static assets or in R2
- reference cached image URLs in rendered pages

This keeps runtime simple and performance predictable.

### Screenshot capture recommendation

Best V1 tradeoff:

- GitHub Actions decides which entries need screenshot refresh
- screenshots are generated before deploy
- screenshots are cached by URL hash
- unchanged entries keep existing screenshots

Fallback behavior:

- if a screenshot fails, use a generated branded placeholder card
- never block deploy on screenshot failure

### Why not runtime screenshots for page views

- slower
- more expensive
- weaker cache predictability
- unnecessary for a static directory

If a screenshot API is still desired, keep it internal and build-oriented:

- input: target URL
- output: cached screenshot asset
- used by CI, not by end users

## Technical Architecture

Recommended stack:

- Cloudflare Worker
- Cloudflare static assets
- Tailwind CSS v4
- vanilla TypeScript for interactive filtering
- small Node-based build scripts

No major frontend framework in V1.

### Runtime responsibilities

Worker responsibilities:

- serve static assets
- handle redirects and cache headers
- optionally expose a build-only screenshot endpoint

Static output responsibilities:

- all HTML pages
- CSS bundle
- JS bundle
- screenshots
- JSON search index
- sitemap and robots files

## Build And Deploy Workflow

Use GitHub Actions as the main orchestrator.

Recommended workflow triggers:

- on push to `main`
- nightly scheduled rebuild
- manual workflow dispatch

Recommended pipeline stages:

1. fetch upstream sources
2. normalize and dedupe data
3. generate screenshots for changed entries
4. render static site
5. run link and metadata checks
6. deploy to Cloudflare

### Why scheduled rebuilds matter

Because V1 depends on external public repositories, the catalog must refresh regularly even when local code does not change.

## Content Strategy For V1

Because there are no detail pages, the written content needs to live on landing pages.

Highest-value landing page types:

- broad AI API index
- capability pages
- top thematic collections
- free APIs by high-intent task

Examples:

- Free APIs for AI Agents
- Browser Automation APIs
- Search APIs for RAG
- Text-to-Speech APIs
- Speech-to-Text APIs
- OCR and Document APIs
- Translation APIs
- Geocoding APIs for Agent Workflows
- Email and Messaging APIs
- Developer Tool APIs

## Risks And Mitigations

### Risk: weak long-tail SEO without detail pages

Mitigation:

- create many useful landing pages
- write strong intros
- ship per-API pages in V2

### Risk: upstream data quality inconsistency

Mitigation:

- normalize aggressively
- keep source provenance
- add validation rules

### Risk: screenshot generation is flaky

Mitigation:

- cache aggressively
- only refresh changed entries
- fallback placeholders
- do not block deploy

### Risk: too many pages with duplicate intent

Mitigation:

- only pre-render selected filter combinations
- use canonical URLs carefully
- keep client-side filter states non-indexable by default

## V1 Deliverables

- source ingestion pipeline
- normalized dataset
- search index
- pre-rendered homepage
- pre-rendered category pages
- pre-rendered capability pages
- pre-rendered curated collection pages
- all APIs page with pagination
- contact page
- screenshot generation pipeline
- Cloudflare deployment
- sitemap, robots, canonical tags, and metadata

## Recommended V1 Build Order

1. Define schema and taxonomy
2. Implement source ingestion and normalization
3. Generate a first merged dataset
4. Build static templates for home and listing pages
5. Add client-side filtering
6. Add screenshot pipeline
7. Add SEO metadata and sitemap generation
8. Deploy to Cloudflare through GitHub Actions

## Strong Recommendation

Respect the no-detail-pages constraint for V1, but treat it as temporary.

For a directory in this niche, the biggest medium-term SEO and product upside will come from:

- per-API detail pages
- public machine-readable endpoints
- editorial curation on top of imported public data

V1 should be built so those can be added without changing the core data model.
