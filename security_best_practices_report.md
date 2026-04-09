# Security Best Practices Audit Report

Date: 2026-04-09
Project: `saxi.ai`
Audited by: Codex (`security-best-practices` workflow)

## Scope

Reviewed areas:

- Cloudflare Worker runtime
- Static HTML generation and client-side rendering
- Source ingestion, link-audit, and screenshot pipeline
- GitHub Actions build/deploy workflows
- Current production response headers on `https://saxi.ai/`

## Findings

### 1. High: Untrusted upstream URLs are accepted as-is and then used for links, HTTP fetches, and Playwright browsing

Affected files:

- `src/build/utils.ts:44-69`
- `src/build/normalize.ts:336-360`
- `src/build/render.ts:329`
- `src/client/app.js:44`
- `src/build/audit-links.ts:184-191`
- `src/build/capture-screenshots.ts:123-154`

Evidence:

- `safeUrl()` accepts any string that `new URL()` can parse and does not restrict protocol or destination class.
- Those values become both `docsUrl` and `screenshotTargetUrl`.
- The resulting URLs are rendered directly into `<a href="...">` for users and are also fetched by the audit job and loaded by Playwright during screenshot generation.
- Local verification confirms that the current URL handling accepts dangerous schemes:

```text
javascript:alert(1) => javascript:alert(1)
data:text/html,<script>alert(1)</script> => data:text/html,<script>alert(1)</script>
file:///etc/passwd => file:///etc/passwd
https://example.com => https://example.com/
```

Why this matters:

- A malicious or compromised upstream catalog entry can inject unsafe navigation targets such as `javascript:` or `data:`.
- The same issue is more serious in CI: the screenshot and audit pipeline can be tricked into requesting `file:`, `localhost`, RFC1918, link-local, or metadata endpoints from the GitHub runner.
- Because screenshots are cached and then published, a `file:` target can become a local file disclosure path if a malicious source ever lands in the imported data.

Recommended fix:

- Restrict accepted schemes to `https:`. If you must keep `http:` for user-facing links, never allow it for screenshot/audit fetches.
- Reject `javascript:`, `data:`, `file:`, `blob:`, `ftp:` and any non-web protocol centrally inside `safeUrl()`.
- Add explicit host validation for screenshot/audit targets: block `localhost`, loopback, RFC1918, link-local, metadata ranges, and plain IP literals unless explicitly allowlisted.
- Treat upstream URL changes as untrusted data, not trusted config.

### 2. Medium: The public site ships without baseline browser security headers

Affected files:

- `src/worker.ts:49-53`

Runtime evidence:

`curl -I https://saxi.ai/` currently returns:

```text
HTTP/2 200
content-type: text/html
cache-control: public, max-age=0, must-revalidate
server: cloudflare
```

The response does not include visible hardening headers such as:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `frame-ancestors` or `X-Frame-Options`

Why this matters:

- Without CSP, any present or future markup injection bug has a larger blast radius.
- Without frame protections, the directory can be embedded and clickjacked.
- Without `X-Content-Type-Options: nosniff`, browsers keep MIME sniffing fallback behavior.
- Without HSTS, HTTPS enforcement depends entirely on redirects instead of a browser-persisted policy.

Recommended fix:

- Add a response hardening layer in the Worker for HTML and static assets.
- Start with a strict but practical baseline:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`
  - `Permissions-Policy` with only the capabilities you actually need
  - A CSP that accounts for self-hosted assets, Google Fonts, and the inline JSON-LD blocks

### 3. Medium: Deploy secrets are exposed to the full CI job, including the third-party screenshot crawl

Affected files:

- `.github/workflows/deploy.yml:22-26`
- `.github/workflows/deploy.yml:52-56`
- `.github/workflows/deploy.yml:74-75`

Evidence:

- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SCREENSHOT_API_BASE_URL`, and `SCREENSHOT_API_TOKEN` are declared as job-level environment variables.
- The same job then installs Chromium and browses large numbers of third-party sites before deployment.

Why this matters:

- This is not an immediate secret leak, but it widens the blast radius unnecessarily.
- If a dependency, script, or browser process misbehaves, the job already has production deployment credentials available in its environment.
- Principle of least privilege says these values should exist only in the steps that actually need them.

Recommended fix:

- Split the workflow into separate jobs:
  - `build` / `screenshots` job without Cloudflare deploy credentials
  - `deploy` job that consumes the built artifact and gets Cloudflare secrets only there
- If `SCREENSHOT_API_*` is still used, scope those env vars only to the screenshot step.
- Keep the production deploy token unavailable to `npm ci`, screenshot capture, and link verification steps.

### 4. Medium: Production content is built from mutable upstream branches and auto-deployed on a schedule without review

Affected files:

- `src/build/constants.ts:19-40`
- `.github/workflows/deploy.yml:5-9`
- `.github/workflows/deploy.yml:61-75`

Evidence:

- Source imports point directly at `master` / `main` branch raw files on third-party GitHub repositories.
- The deploy workflow runs on a daily schedule and pushes the generated output to production automatically.

Why this matters:

- A compromise, accidental bad edit, or malicious PR landing in one of those upstream repositories can change your production data with no human review step.
- In isolation this is a supply-chain integrity risk; combined with Finding 1 it also becomes a practical URL abuse path.

Recommended fix:

- Pin remote source snapshots to specific commit SHAs instead of floating branch heads.
- Better: move the refresh into a PR-producing workflow so imported changes are reviewed before deployment.
- At minimum, store a fetched snapshot artifact and diff it between runs so unexpected URL/protocol changes are visible.

### 5. Low: GitHub Actions are pinned to moving version tags instead of immutable SHAs

Affected files:

- `.github/workflows/build.yml:17-21`
- `.github/workflows/deploy.yml:29-42`
- `.github/workflows/deploy.yml:67-69`

Evidence:

- The workflows use tags such as `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/cache/*@v4`.

Why this matters:

- Version tags are safer than `@main`, but they still move.
- Immutable SHA pinning reduces the risk of a compromised or unexpectedly changed action release affecting the pipeline.

Recommended fix:

- Pin third-party actions to full commit SHAs.
- Optionally pair this with Dependabot or Renovate so action updates stay reviewable.

## Positive notes

- I did not find checked-in credentials or private keys in the current repository tree or in a targeted history scan of common secret patterns.
- External API links are opened with `rel="noreferrer"`, which is good baseline hygiene for outbound navigation.
- Canonical HTTPS/apex redirects are in place and working in production.
- The health endpoint returns `cache-control: no-store`, which is appropriate.

## Priority order for remediation

1. Fix URL validation centrally and block non-web / internal destinations before the next scheduled import.
2. Add baseline response security headers in the Worker.
3. Split CI jobs so deploy secrets are not present during screenshot and build phases.
4. Stop auto-deploying directly from mutable third-party branch heads or at least gate refreshes through review.
5. Pin GitHub Actions to immutable SHAs.

## Residual risk / open question

- I only see the security posture that is represented in this repository and the current live responses. If Cloudflare edge rules or zone-level security settings exist outside the repo, they are not visible here and should be verified separately.
