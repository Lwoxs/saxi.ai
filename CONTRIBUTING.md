# Contributing

## Add your API

saxi.ai accepts free public APIs through pull requests.

1. Create a new JSON file in `data/community-apis/`.
2. Use `data/community-apis/_template.json` as the shape.
3. Use a lowercase kebab-case filename, for example `my-example-api.json`.
4. Open a pull request with the `add-api` template.

The "Add your API" button on saxi.ai opens GitHub's new-file editor, not the final pull request screen. GitHub needs a branch with your JSON file before it can create a pull request. After you rename the file, replace the placeholders, and click "Propose changes", GitHub opens the pull request flow.

Only submit APIs that have public documentation and a free public plan or free public access.

Required JSON shape:

```json
{
  "name": "Example API",
  "description": "One clear sentence describing what the API does.",
  "docsUrl": "https://example.com/docs",
  "websiteUrl": "https://example.com",
  "categories": ["Development"],
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
- Replace every placeholder from the template before opening the pull request.
- The docs URL must be reachable without login.
- Paid-only APIs, private APIs, parked domains, and affiliate-only listings will be rejected.
- Keep the description factual and short.
- Use only categories from the allowed list below.
- `auth` must be one of `No Auth`, `API Key`, `OAuth`, `Basic Auth`, or `Unknown`.
- `cors` must be one of `Yes`, `No`, or `Unknown`.
- `notes` must explain why the API should be listed.
- Pull requests run an automatic validation check for required fields, allowed categories, URL format, and filename format.

Allowed categories:

- Animals
- Anime
- Anti-Malware
- Art & Design
- Authentication & Authorization
- Blockchain
- Books
- Business
- Calendar
- Chats & Messaging
- Cloud Storage & File Sharing
- Commerce
- Continuous Integration
- Cryptocurrency
- Currency Exchange
- Data Validation
- Development
- Dictionaries
- Disasters
- Documents & Productivity
- Education
- Email
- Email & SMS
- Entertainment
- Environment
- Events
- Finance
- Finance & Economics
- Food & Drinks
- Games & Comics
- Geocoding
- Government
- Health
- Jobs
- Machine Learning
- Maps & Geo
- Marketing & SEO
- Music
- Music & Audio
- News
- Open Data
- Open Source Projects
- Patent
- Payments
- Personality
- Phone
- Photography
- Programming
- Project Management
- Science & Math
- Search
- Shopping
- Social
- Sports & Fitness
- Test Data
- Text Analysis
- Tracking
- Transportation
- URL Shorteners
- Video
- Voice
- Weather
