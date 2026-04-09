const MAX_RENDERED_RESULTS = 120;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCard(api) {
  const capabilityBadges = api.capabilities
    .slice(0, 4)
    .map((capability) => `<span class="badge">${escapeHtml(capability)}</span>`)
    .join("");

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
    data-categories="${escapeHtml((api.sourceCategories || []).join("|"))}"
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
          ${capabilityBadges}
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

function getFieldValue(form, name) {
  const field = form.elements.namedItem(name);
  return field && typeof field.value === "string" ? field.value : "";
}

function hydrateSearchPage() {
  const form = document.querySelector("[data-filter-form]");
  const container = document.querySelector("[data-search-index]");
  const grid = container?.querySelector("[data-results-grid]");
  const count = document.querySelector("[data-results-count]");

  if (!(form instanceof HTMLFormElement) || !(container instanceof HTMLElement) || !(grid instanceof HTMLElement)) {
    return;
  }

  const indexPath = container.dataset.searchIndex;
  if (!indexPath) {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  for (const [key, value] of params.entries()) {
    const field = form.elements.namedItem(key);
    if (field && "value" in field) {
      field.value = value;
    }
  }

  fetch(indexPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch search index: ${response.status}`);
      }

      return response.json();
    })
    .then((payload) => {
      const allApis = Array.isArray(payload.apis) ? payload.apis : [];

      const updateQueryString = () => {
        const nextParams = new URLSearchParams();
        const formData = new FormData(form);

        for (const [key, value] of formData.entries()) {
          if (typeof value === "string" && value.trim().length > 0) {
            nextParams.set(key, value);
          }
        }

        const nextUrl = `${window.location.pathname}${nextParams.size > 0 ? `?${nextParams.toString()}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      };

      const renderResults = () => {
        const q = getFieldValue(form, "q").trim().toLowerCase();
        const category = getFieldValue(form, "category");
        const section = getFieldValue(form, "section");
        const capability = getFieldValue(form, "capability");
        const auth = getFieldValue(form, "auth");
        const official = getFieldValue(form, "official");
        const openapi = getFieldValue(form, "openapi");
        const sort = getFieldValue(form, "sort") || "relevance";

        const filtered = allApis.filter((api) => {
          const matchesQuery = q.length === 0 || api.searchText.includes(q);
          const matchesCategory = !category || (Array.isArray(api.sourceCategories) && api.sourceCategories.includes(category));
          const matchesSection = !section || api.primaryCategory === section;
          const matchesCapability = !capability || api.capabilities.includes(capability);
          const matchesAuth = !auth || api.authType === auth;
          const matchesOfficial =
            !official || (official === "yes" ? api.isOfficial === true : api.isOfficial === false);
          const matchesOpenApi =
            !openapi || (openapi === "yes" ? api.hasOpenApi === true : api.hasOpenApi === false);

          return (
            matchesQuery &&
            matchesCategory &&
            matchesSection &&
            matchesCapability &&
            matchesAuth &&
            matchesOfficial &&
            matchesOpenApi
          );
        });

        filtered.sort((left, right) => {
          if (sort === "alphabetical") {
            return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
          }

          if (sort === "freshness") {
            return right.freshnessScore - left.freshnessScore || right.weight - left.weight;
          }

          return right.weight - left.weight || left.name.localeCompare(right.name, "en", { sensitivity: "base" });
        });

        const visible = filtered.slice(0, MAX_RENDERED_RESULTS);
        grid.innerHTML =
          visible.length > 0
            ? visible.map((api) => renderCard(api)).join("")
            : `<div class="glass-callout md:col-span-2 xl:col-span-3">
                No APIs match the current filters. Try clearing one or two constraints.
              </div>`;

        if (count) {
          count.textContent =
            filtered.length > MAX_RENDERED_RESULTS
              ? `${MAX_RENDERED_RESULTS} / ${filtered.length} APIs`
              : `${filtered.length} APIs`;
        }

        updateQueryString();
      };

      form.addEventListener("input", renderResults);
      form.addEventListener("change", renderResults);
      renderResults();
    })
    .catch((error) => {
      console.error(error);
    });
}

hydrateSearchPage();
