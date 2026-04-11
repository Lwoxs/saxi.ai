# Community API submissions

Add one JSON file per API in this directory and open a pull request.

Use a lowercase kebab-case filename, for example:

```text
my-example-api.json
```

Required fields:

```json
{
  "name": "Example API",
  "description": "One clear sentence describing what the API does.",
  "docsUrl": "https://example.com/docs",
  "websiteUrl": "https://example.com",
  "categories": ["Machine Learning"],
  "auth": "API Key",
  "cors": "Unknown",
  "https": true,
  "free": true,
  "openapiUrl": "",
  "notes": "Why should this API be listed on saxi.ai?"
}
```

Rules:

- The API must have a free public plan or free public access.
- The docs URL must be public and reachable without logging in.
- Do not submit affiliate links, parked domains, paid-only APIs, or private/internal APIs.
- Put only factual product information in the JSON file.

