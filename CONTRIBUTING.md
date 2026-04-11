# Contributing

## Add your API

saxi.ai accepts free public APIs through pull requests.

1. Create a new JSON file in `data/community-apis/`.
2. Use `data/community-apis/_template.json` as the shape.
3. Use a lowercase kebab-case filename, for example `my-example-api.json`.
4. Open a pull request with the `add-api` template.

Only submit APIs that have public documentation and a free public plan or free public access.

Required JSON shape:

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

Review rules:

- The API must be public and free to start using.
- The docs URL must be reachable without login.
- Paid-only APIs, private APIs, parked domains, and affiliate-only listings will be rejected.
- Keep the description factual and short.

