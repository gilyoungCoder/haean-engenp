# Haean (해안) — AI English Exam Question Generator

> Upload a school exam paper or English passage (JPG, PNG, PDF), and Haean's AI automatically generates variation questions, workbooks, and homomorphic mock exams — exported as `.docx` files ready for classroom use.

## Demo

**Live**: [https://engenp-v2.vercel.app](https://engenp-v2.vercel.app)

## Features

- **Passage Structurization** — Claude Vision API analyzes uploaded images/PDFs and extracts structured passage data (paragraphs, sentences, vocabulary, grammar points, difficulty level)
- **Question Generation** — Generates 10 question types across 3 modes (variation, workbook, mock exam) using RAG-based prompt templates with few-shot examples
- **School DNA Analysis** — Upload past school exams to detect question patterns, difficulty distribution, and grammar focus — then generate questions matching the school's style
- **AI Chat Editing** — Real-time chat sidebar to refine generated questions (adjust difficulty, add/remove questions, modify explanations) with SSE streaming
- **DOCX Export** — Download generated questions as formatted Word documents ready for classroom use
- **Project History** — Save, load, and restore past generations including passage, questions, chat history, and uploaded files
- **Subscription Management** — Free/Pro/Pro+ tiers with monthly usage tracking and Toss Payments integration

## Architecture

### 2-Step Pipeline

```
Client (browser)
  |
  |-- POST /api/upload        →  File → Cloudflare R2 + base64
  |
  |-- POST /api/structurize   →  Claude VLM → StructuredPassage JSON    (< 30s)
  |
  |-- POST /api/generate      →  Claude Text → GeneratedQuestion[] JSON (< 40s)
  |
  |-- POST /api/chat           →  SSE streaming for real-time editing
  |
  |-- POST /api/export         →  .docx file generation
```

The pipeline is split into **two separate API calls** from the client to stay within Vercel's 60-second serverless timeout. Each step completes independently.

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | SSR + API Routes + Serverless |
| Language | TypeScript (strict mode) | Type safety, zero build errors |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) | Utility-first styling + accessible components |
| Icons | Lucide React | Consistent icon set |
| Database | MongoDB Atlas (Mongoose) | Document storage for passages, questions, chat |
| Storage | Cloudflare R2 (S3-compatible) | File uploads (10GB free/month, zero egress fees) |
| Auth | NextAuth.js v5 | Google OAuth + session management |
| AI | Anthropic Claude API (Sonnet) | VLM for images, text generation for questions |
| Payments | Toss Payments | Korean payment processor for subscriptions |
| Hosting | Vercel (Hobby) | Serverless deployment with 60s timeout |
| PDF | pdf-parse | Text extraction from PDF files |
| DOCX | docx | Word document generation |

### Database Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `User` | Authentication + profile | email, name, image, OAuth provider |
| `Passage` | Uploaded file + structured output | title, structuredData, originalFileUrl/Key |
| `QuestionSet` | Generated questions per passage | questions[], options, status |
| `ChatMessage` | AI chat editing history | role, content, passageId |
| `Subscription` | Plan info + billing | plan (free/pro/pro+), billingCycle |
| `UsageLog` | API call tracking + quota enforcement | action, userId, timestamp |

### API Endpoints (14 routes)

| Route | Method | Description | Timeout |
|-------|--------|-------------|---------|
| `/api/upload` | POST | Upload file to R2, create Passage record | 60s |
| `/api/structurize` | POST | VLM passage analysis (image) or text extraction (PDF) | 60s |
| `/api/generate` | POST | Question generation with RAG templates | 60s |
| `/api/chat` | POST | AI chat editing (SSE streaming) | 60s |
| `/api/export` | POST | Generate .docx Word document | 60s |
| `/api/analyze-dna` | POST | School exam pattern detection | 60s |
| `/api/validate` | POST | Single-pass question validation | 60s |
| `/api/projects` | GET | List user's projects + monthly usage | - |
| `/api/projects/[id]` | GET/DELETE | Project detail (with file base64 from R2) / Delete | - |
| `/api/auth/[...nextauth]` | POST | NextAuth.js OAuth handler | - |
| `/api/auth/register` | POST | Email/password registration | - |
| `/api/payments/confirm` | POST | Toss payment confirmation | - |
| `/api/payments/webhook` | POST | Toss webhook handler | - |
| `/api/payments/cancel` | POST | Subscription cancellation | - |

### Question Types (16 types across 3 modes)

**Variation Mode** (10 types):
| Type ID | Name (KR) | Description |
|---------|-----------|-------------|
| `grammar_choice` | 어법 선택 | Grammar-based multiple choice |
| `vocabulary_choice` | 어휘 선택 | Vocabulary-based multiple choice |
| `blank_inference` | 빈칸 추론 | Fill-in-the-blank inference |
| `sentence_ordering` | 순서 배열 | Sentence ordering |
| `sentence_insertion` | 문장 삽입 | Sentence insertion into passage |
| `topic_summary` | 주제/요약 | Topic identification and summarization |
| `content_match` | 내용 일치 | Content matching (true/false) |
| `eng_to_eng` | 영영풀이 | English-to-English definition matching |
| `sentence_transform` | 문장 변형 | Sentence transformation |
| `verb_transform` | 동사 변형 | Verb form transformation |

**Workbook Mode** (6 additional types):
| Type ID | Name (KR) | Description |
|---------|-----------|-------------|
| `korean_to_english` | 한영 번역 | Korean to English translation |
| `translation_writing` | 번역 서술 | Translation writing |
| `word_order` | 어순 배열 | Word order arrangement |
| `grammar_error_correction` | 어법 오류 | Grammar error correction |
| `sentence_ordering_full` | 전체 순서 | Full passage sentence ordering |
| `content_match_tf` | 내용 일치 T/F | Content match true/false |

**Mock Exam Mode**: Uses variation types + School DNA Profile to match the target school's question style.

### RAG System

Each question type has a JSON template in `data/question_types/` containing:
- Type metadata (name, description, difficulty range, category)
- Instruction templates
- Output schema
- Generation rules (constraints for the AI)
- Few-shot examples

The generator loads relevant templates based on selected types and injects them into Claude's prompt alongside the structured passage.

## Project Structure

```
├── app/
│   ├── api/                    # 14 API route handlers
│   │   ├── structurize/        # VLM passage analysis
│   │   ├── generate/           # Question generation
│   │   ├── chat/               # AI chat (SSE streaming)
│   │   ├── export/             # .docx generation
│   │   ├── upload/             # File upload to R2
│   │   ├── projects/           # Project CRUD + usage stats
│   │   ├── analyze-dna/        # School exam pattern detection
│   │   ├── validate/           # Question validation
│   │   ├── auth/               # NextAuth OAuth + registration
│   │   ├── payments/           # Toss Payments (confirm/webhook/cancel)
│   │   └── _lib/auth.ts        # requireAuth() helper
│   ├── dashboard/page.tsx      # Main app (3-column layout)
│   ├── login/page.tsx          # Login page (Google OAuth)
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout with providers
│   └── ...                     # Other pages (payments, privacy, terms)
│
├── components/
│   ├── ui/                     # shadcn/ui primitives (20+ components)
│   ├── left-sidebar.tsx        # Upload + generation controls
│   ├── main-content.tsx        # Passage display + question cards
│   ├── ai-chat-sidebar.tsx     # Real-time AI chat interface
│   ├── project-history.tsx     # Project list + restore
│   ├── settings-page.tsx       # User settings + subscription
│   └── ...                     # Other components
│
├── lib/
│   ├── services/
│   │   ├── anthropic.ts        # Claude API wrapper (singleton, retry, extractJSON)
│   │   ├── generator.ts        # Question generation pipeline
│   │   ├── structurizer.ts     # VLM passage structurization
│   │   ├── rag.ts              # Question type template loader
│   │   ├── prompt-builder.ts   # Dynamic prompt assembly
│   │   ├── validator.ts        # Question validation
│   │   ├── dna-analyzer.ts     # School exam DNA analysis
│   │   ├── exporter.ts         # .docx generation
│   │   ├── subscription.ts     # Plan management
│   │   └── usage-tracker.ts    # Usage tracking
│   ├── models/                 # 6 Mongoose schemas
│   ├── mongodb.ts              # Connection pooling (global cache)
│   ├── r2.ts                   # Cloudflare R2 client (upload/download/delete)
│   ├── auth.ts                 # NextAuth.js configuration
│   └── types/index.ts          # TypeScript interfaces
│
├── hooks/
│   ├── use-chat.ts             # Chat state + SSE streaming + history loading
│   ├── use-mobile.ts           # Mobile detection
│   └── use-toast.ts            # Toast notifications
│
├── data/
│   ├── question_types/         # 16 JSON type templates (RAG)
│   └── prompts/                # 5 prompt template files (.txt)
│
├── next.config.js              # CSP headers, strict builds
├── middleware.ts                # Empty (auth is per-route)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20.x (required for Tailwind v4 compatibility)
- MongoDB Atlas account (free M0 tier works)
- Cloudflare R2 bucket
- Anthropic API key
- Google OAuth credentials

### Environment Variables

Create `.env.local` with 14 required variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### Installation

```bash
npm install
npm run dev      # http://localhost:3000
```

### Build

```bash
npm run build    # Strict mode — zero TS/ESLint errors required
npm run typecheck # tsc --noEmit
```

### Deploy (Vercel CLI)

```bash
vercel --prod
```

**Important Vercel settings:**
- Node.js version: **20.x** (Settings → General)
- SSO Protection: **Disabled** (for public access)
- Environment variables: Use `printf` (not `echo`) to avoid trailing newlines

## Known Constraints

1. **Vercel 60s timeout** — Each API call must complete within 60 seconds. Questions are capped at 10 per request.
2. **Sonnet only** — Claude Opus times out at ~57s. Sonnet (15-25s) is the safe default.
3. **Validation loop disabled** — Self-correction (3 rounds of validate → fix) adds 45-60s. Disabled until async queue is implemented.
4. **Kakao OAuth disabled** — Requires Korean business registration. Google OAuth only for now.
5. **Scanned PDFs** — PDFs with <50 characters of extractable text are rejected. Upload as JPG/PNG instead.

## Future Work

- **Async queue** (Inngest/QStash) — Re-enable validation loop without timeout constraint
- **Vercel Pro** (300s timeout) — Enable Opus model + validation in a single request
- **Automated E2E tests** — Playwright tests for the full pipeline
- **Kakao OAuth** — After business registration

## License

Private — All rights reserved.

## Author

**Haean Team** (projecthaean)
