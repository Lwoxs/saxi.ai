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
  "categories": ["Development"],
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
