import type { CapabilityRule, CollectionDefinition, SourceDefinition } from "./types.js";

export const SITE_NAME = "saxi.ai";
export const SITE_ORIGIN = "https://saxi.ai";
export const SITE_TAGLINE = "The API directory for AI agents and developers.";
export const CONTACT_EMAIL = "contact@adanos.org";
export const CONTACT_PHONE = "+49-30-54906997";
export const CONTACT_PHONE_LABEL = "+49 30 54906997";
export const COMPANY_NAME = "Adanos Software GmbH";
export const COMPANY_STREET = "Käthe-Niederkirchner-Str. 30";
export const COMPANY_POSTAL = "10407 Berlin";
export const COMPANY_COUNTRY = "Germany";
export const COMPANY_MANAGING_DIRECTOR = "Alexander Schneider";
export const COMPANY_REGISTER_COURT = "Amtsgericht Berlin-Charlottenburg";
export const COMPANY_REGISTER_NUMBER = "HRB 202476 B";
export const COMPANY_VAT_ID = "DE322712492";
export const PAGE_SIZE = 60;

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    id: "public-api-lists",
    label: "Public API Lists",
    repoUrl: "https://github.com/public-api-lists/public-api-lists",
    license: "MIT",
    dataUrl: "https://raw.githubusercontent.com/public-api-lists/public-api-lists/master/README.md"
  },
  {
    id: "public-apis",
    label: "public-apis/public-apis",
    repoUrl: "https://github.com/public-apis/public-apis",
    license: "MIT",
    dataUrl: "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
  },
  {
    id: "tools-collection",
    label: "tools-collection/apis-collection",
    repoUrl: "https://github.com/tools-collection/apis-collection",
    license: "MIT",
    dataUrl: "https://raw.githubusercontent.com/tools-collection/apis-collection/main/dist/apis-list.yaml"
  }
];

export const PRIMARY_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "AI & ML":
    "Free APIs for language models, speech, vision, document processing, translation, and other AI agent capabilities.",
  "Developer Tools":
    "APIs for code, CI, testing, developer workflows, open source tooling, and software delivery automation.",
  "Search & Retrieval":
    "Search, indexing, crawling, scraping, and retrieval APIs for agent workflows, research, and RAG pipelines.",
  "Data & Analytics":
    "Free APIs for metrics, analytics, reporting, structured data access, and data pipelines.",
  Communication:
    "Messaging, email, chat, notifications, and communication APIs that AI tools and developer products can automate.",
  Productivity:
    "Calendar, documents, forms, task management, and office workflow APIs for assistants and operational tools.",
  "Media & Entertainment":
    "Images, video, audio, gaming, design, and content APIs with strong developer and agent use cases.",
  Security:
    "Threat intel, validation, scanning, fraud prevention, reputation, and security-focused APIs.",
  "Finance & Commerce":
    "Payments, shopping, pricing, banking, market data, and commerce APIs available as free public developer resources.",
  "Maps & Mobility":
    "Geocoding, mapping, routing, travel, vehicles, and transport APIs for spatial and logistics workflows.",
  "Cloud & Infrastructure":
    "Cloud platform, storage, database, infrastructure, and observability APIs for modern applications and agents.",
  "Knowledge & Open Data":
    "Government, scientific, encyclopedic, weather, and public data APIs with broad downstream reuse.",
  "Identity & Auth":
    "Authentication, authorization, profile, and identity APIs for secure user and app workflows.",
  "Health & Lifestyle":
    "Health, fitness, food, and lifestyle APIs that support consumer and operational use cases.",
  Utilities:
    "Small but useful APIs for formatting, generation, random data, URL tooling, and common developer tasks."
};

export const CAPABILITY_RULES: CapabilityRule[] = [
  {
    slug: "llm",
    label: "LLM",
    description: "Language model APIs for generation, reasoning, and agent orchestration.",
    keywords: ["gpt", "llm", "language model", "chat completion", "foundation model", "generative ai"],
    categoryKeywords: ["ai & ml", "machine learning"]
  },
  {
    slug: "chat",
    label: "Chat",
    description: "Chat-centric APIs for assistants, messaging experiences, and conversational workflows.",
    keywords: ["assistant", "conversation", "chat", "chatbot"]
  },
  {
    slug: "embeddings",
    label: "Embeddings",
    description: "Vector and embeddings APIs for retrieval, semantic search, and ranking.",
    keywords: ["embedding", "vector", "semantic search"]
  },
  {
    slug: "search",
    label: "Search",
    description: "Search and discovery APIs for content lookup, indexing, and retrieval pipelines.",
    keywords: ["search", "search engine", "discovery", "lookup", "retrieval"],
    categoryKeywords: ["search"]
  },
  {
    slug: "browser-automation",
    label: "Browser Automation",
    description: "APIs for screenshots, browser control, web automation, and page rendering.",
    keywords: ["browser", "screenshot", "headless", "playwright", "rendering", "thumbnail"]
  },
  {
    slug: "scraping",
    label: "Scraping",
    description: "Scraping and crawling APIs for acquiring structured web data.",
    keywords: ["scrape", "scraping", "crawler", "crawl", "serp", "web data"]
  },
  {
    slug: "ocr",
    label: "OCR",
    description: "Optical character recognition and document extraction APIs.",
    keywords: ["ocr", "optical character recognition", "document extraction", "document parsing", "pdf extraction"]
  },
  {
    slug: "vision",
    label: "Vision",
    description: "Vision APIs for image analysis, recognition, and computer vision tasks.",
    keywords: ["computer vision", "image recognition", "face recognition", "object detection", "visual search"]
  },
  {
    slug: "image-generation",
    label: "Image Generation",
    description: "Image generation and editing APIs for visual creation workflows.",
    keywords: ["image generation", "image editing", "text-to-image", "image to", "vectorization"]
  },
  {
    slug: "speech-to-text",
    label: "Speech to Text",
    description: "Speech recognition and transcription APIs.",
    keywords: ["speech-to-text", "speech recognition", "transcription", "transcribe", "audio to text"]
  },
  {
    slug: "text-to-speech",
    label: "Text to Speech",
    description: "Voice synthesis and speech generation APIs.",
    keywords: ["text-to-speech", "speech synthesis", "voice synthesis", "voice generation", "audio generation"]
  },
  {
    slug: "translation",
    label: "Translation",
    description: "Translation and multilingual content APIs for global products and agents.",
    keywords: ["translation", "translate", "multilingual", "localization", "language detection"]
  },
  {
    slug: "summarization",
    label: "Summarization",
    description: "Summarization and condensation APIs for text, media, and documents.",
    keywords: ["summary", "summarization", "summarize"]
  },
  {
    slug: "code-execution",
    label: "Code Execution",
    description: "Compile, sandbox, and execute code through APIs.",
    keywords: ["code execution", "compile and run", "sandbox", "code interpreter", "judge0"]
  },
  {
    slug: "email",
    label: "Email",
    description: "Email APIs for transactional workflows, notifications, and agent actions.",
    keywords: ["email", "mail"],
    categoryKeywords: ["email", "email & sms"]
  },
  {
    slug: "messaging",
    label: "Messaging",
    description: "SMS, chat, and messaging APIs for notifications and conversational interfaces.",
    keywords: ["messaging", "sms", "chat", "whatsapp"],
    categoryKeywords: ["chats & messaging", "email & sms"]
  },
  {
    slug: "scheduling",
    label: "Scheduling",
    description: "Calendar and scheduling APIs for assistants and operational tooling.",
    keywords: ["calendar", "schedule", "booking"],
    categoryKeywords: ["calendar", "calendar & time"]
  },
  {
    slug: "payments",
    label: "Payments",
    description: "Payments and billing APIs for commercial workflows.",
    keywords: ["payment", "checkout", "billing", "invoice", "payout"],
    categoryKeywords: ["payments"]
  },
  {
    slug: "geocoding",
    label: "Geocoding",
    description: "Geocoding, routing, and maps APIs for location-aware products and agents.",
    keywords: ["geocoding", "maps", "routing", "location", "places"],
    categoryKeywords: ["geocoding", "maps & geo", "transportation", "travel"]
  },
  {
    slug: "observability",
    label: "Observability",
    description: "Logging, tracing, monitoring, and metrics APIs.",
    keywords: ["observability", "monitoring", "logging", "logs", "metrics", "tracing", "analytics"]
  },
  {
    slug: "memory-storage",
    label: "Memory & Storage",
    description: "Storage, file, and database APIs that agents can use as memory or state backends.",
    keywords: ["storage", "database", "files", "object storage", "drive"],
    categoryKeywords: ["cloud storage & file sharing", "files & storage", "databases"]
  }
];

export const COLLECTION_DEFINITIONS: CollectionDefinition[] = [
  {
    slug: "free-apis-for-ai-agents",
    title: "Free APIs for AI Agents",
    description: "Free APIs for building AI agents — search, browser automation, speech, translation, messaging, memory, and LLM inference.",
    intro:
      "APIs that cover the most common needs of tool-calling agents: finding information, controlling browsers, processing speech, translating text, sending messages, and storing state.",
    anyCapabilities: [
      "llm",
      "search",
      "browser-automation",
      "speech-to-text",
      "text-to-speech",
      "translation",
      "ocr",
      "email",
      "messaging",
      "memory-storage"
    ],
    categories: ["AI & ML", "Search & Retrieval", "Developer Tools", "Communication"],
    minItems: 12
  },
  {
    slug: "browser-automation-apis",
    title: "Browser Automation APIs",
    description: "Free APIs for taking screenshots, rendering pages, and automating browsers.",
    intro:
      "Need to screenshot a URL, render a page to PDF, or control a headless browser? These free APIs handle it.",
    anyCapabilities: ["browser-automation", "scraping"],
    minItems: 6
  },
  {
    slug: "speech-to-text-apis",
    title: "Speech to Text APIs",
    description: "Free speech recognition and transcription APIs for turning audio into text.",
    intro:
      "Turn audio into text with these free APIs — useful for voice interfaces, meeting transcription, and audio processing.",
    anyCapabilities: ["speech-to-text"],
    minItems: 5
  },
  {
    slug: "search-and-rag-apis",
    title: "Search and RAG APIs",
    description: "Free search, retrieval, crawling, and discovery APIs for RAG pipelines and research workflows.",
    intro:
      "Search engines, web crawlers, and content APIs that give your application access to real-world data for retrieval-augmented generation.",
    anyCapabilities: ["search", "scraping", "embeddings"],
    minItems: 8
  },
  {
    slug: "translation-apis",
    title: "Translation APIs",
    description: "Free translation APIs for adding multilingual support to any application.",
    intro:
      "Translate text between languages, detect languages automatically, and localize content — all with free API access.",
    anyCapabilities: ["translation"],
    minItems: 5
  },
  {
    slug: "developer-tool-apis",
    title: "Developer Tool APIs",
    description: "Free APIs for CI/CD, testing, monitoring, code analysis, and infrastructure.",
    intro:
      "APIs for the developer toolchain — from code compilation and linting to deployment, monitoring, and infrastructure management.",
    categories: ["Developer Tools", "Cloud & Infrastructure"],
    minItems: 12
  }
];
