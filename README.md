# Lead Management Platform

An internal outreach platform for Tech Armor Solutions. Discover leads via Google Places, enrich company and contact data with AI, build multi-step campaigns with email and manual touchpoints, and track opens, clicks, and replies — all in one place.

---

## Features

- **Lead Discovery** — Search Google Places by keyword and location, save searches for re-running later
- **Company Database** — Save companies from search results or add them manually; view AI-enriched profiles
- **AI Enrichment** — One-click Claude-powered research finds decision-makers, LinkedIn profiles, company summaries, tech stack, and recent news
- **Contact Management** — Full contact database with status tracking, CSV export, and manual add
- **Multi-Step Campaigns** — Build outreach sequences with email, LinkedIn, cold call, and task steps
- **Gmail Integration** — Sends through your connected Gmail account via OAuth
- **Email Tracking** — Pixel-based open tracking and click-through redirect tracking
- **Reply Detection** — Background cron polls Gmail every 10 minutes and cancels pending sends when a reply is detected
- **Analytics** — Per-campaign and per-step metrics (sent, open rate, click rate, reply rate)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma 7 (adapter-pg) |
| AI | Anthropic SDK (`claude-haiku` for enrichment, `claude-sonnet` for copy) |
| Web Search | Anthropic `web_search_20250305` tool (server-side) |
| Email | Gmail API via Google OAuth 2.0 |
| Lead Discovery | Google Places API v1 (Text Search) |
| Auth | iron-session v8 + bcryptjs |
| Background Jobs | node-cron v4 via `instrumentation.ts` |

---

## Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys for: Anthropic, Google Places, Google OAuth (Gmail)

---

## Install

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd lead-management
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lead_management

# Auth — bcrypt hash of your admin password
# Generate with: node -e "const b=require('bcryptjs');b.hash('yourpassword',10).then(console.log)"
ADMIN_PASSWORD_HASH=$2b$10$...

# Session encryption (any long random string)
SESSION_SECRET=your-random-secret-here

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-...

# Google Places API (for lead discovery)
GOOGLE_PLACES_API_KEY=AIza...

# Gmail OAuth (for sending emails)
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback

# App URL (used for tracking pixel and click redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Generate your password hash

```bash
node -e "const b=require('bcryptjs');b.hash('yourpassword',10).then(console.log)"
```

Copy the output into `ADMIN_PASSWORD_HASH` in your `.env`.

### 4. Set up the database

```bash
npx prisma db push
```

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` and log in with the password you hashed above.

---

## Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable the **Gmail API**
3. Create OAuth 2.0 credentials (type: Web Application)
4. Add `http://localhost:3000/api/auth/gmail/callback` as an authorized redirect URI
5. Copy the Client ID and Secret into your `.env`
6. In the app, go to **Settings → Gmail** and click **Connect Gmail** to authorize

---

## Google Places API Setup

1. In Google Cloud Console, enable the **Places API (New)**
2. Create an API key and restrict it to the Places API
3. Add the key as `GOOGLE_PLACES_API_KEY` in your `.env`

---

## How It Works

### Lead Discovery

Go to **Lead Discovery** and search for businesses by keyword (e.g. "restaurants") and location (e.g. "Austin TX"). Results come from Google Places and can be saved directly to your company database. You can save searches and re-run them later to find new additions.

### Companies & AI Enrichment

The **Companies** page shows all saved companies. You can also add companies manually using the **Add Company** button. Click into any company to view its details, then hit **Enrich with AI** to run a web search that finds:

- Decision-maker contacts (owner, CEO, marketing director) with email and LinkedIn
- Company LinkedIn page
- 2–3 sentence company summary
- Recent news
- Tech stack clues

Enrichment uses `claude-haiku` with the Anthropic `web_search` tool (~$0.05/company).

### Contacts

The **Contacts** page is a searchable, filterable database of all contacts across all companies. Contacts can be:

- Created automatically by AI enrichment
- Added manually from a company's detail page via the **Add Contact** button

Contact statuses: **New → Contacted → Responded → Qualified → Closed / Not Interested / Do Not Contact**

Contacts marked **Do Not Contact** are blocked from all campaigns. The full list can be exported as CSV.

### Campaigns

#### Building a Campaign

Go to **Campaigns → New Campaign**. A campaign has:

1. **Name and industry** (industry is used as context for AI copy generation)
2. **Contacts** — select who to target from your database
3. **Steps** — the outreach sequence

#### Step Types

| Type | Automated | Fields |
|---|---|---|
| **Email** | Yes — sent via Gmail | Subject, Body, personalization tags |
| **LinkedIn Connect** | No — manual reminder | Notes (what to say in the request) |
| **LinkedIn Message** | No — manual reminder | Notes / message template |
| **Cold Call** | No — manual reminder | Call script / talking points |
| **Task** | No — manual reminder | Instructions |

Email steps fire automatically. All other step types appear in the campaign view as manual reminders so you know what to do and when.

Each step has a **delay** (days after the previous step). Step 1 always triggers immediately on launch.

**Personalization tags** (email steps only):
- `{{first_name}}` — contact's first name
- `{{company_name}}` — company name
- `{{sender_name}}` — your agency name from Settings

#### AI Copy Generation

Click **AI Copy** in the campaign builder to generate email subject lines and bodies for all Email steps at once, using your agency profile from Settings as context. Non-email steps are not affected.

#### Campaign Lifecycle

| Status | Meaning |
|---|---|
| Draft | Work in progress |
| Ready | Marked for review |
| Approved | Ready to launch |
| Active | Launched, sends in progress |
| Paused | Temporarily paused |
| Completed | All sends finished |

Workflow: build → **Mark as Ready** → **Approve** → **Launch**.

On launch, step 1 email sends fire immediately (throttled: 5 at a time with a 2-second pause). Later email steps are scheduled and processed by a background cron that runs every hour. Non-email steps are displayed as manual tasks.

#### Reply Detection

Every 10 minutes a background cron polls your Gmail inbox. When a reply is detected from a contact in an active campaign, all their remaining scheduled sends are automatically cancelled — you won't follow up with someone who already responded.

### Analytics

The **Analytics** page shows:

- Overall totals across all campaigns (sent, open rate, click rate, reply rate)
- Per-campaign breakdown table
- Step-by-step breakdown for each campaign that has sends

Open tracking uses a 1×1 invisible pixel injected into each email. Click tracking wraps links in a redirect URL that records the click before forwarding the user to the destination.

### Settings

- **Agency Profile** — Name, services, value proposition, target industries, pain points. Used as context for AI copy generation.
- **Gmail** — Connect your Google account for sending. One account at a time.

---

## Deployment (Hostinger VPS)

### 1. Build

```bash
npm run build
```

### 2. Start with PM2

```bash
pm2 start npm --name lead-mgmt -- start
pm2 save
pm2 startup   # sets PM2 to auto-start on reboot
```

### 3. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Update production environment variables

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
GMAIL_REDIRECT_URI=https://yourdomain.com/api/auth/gmail/callback
```

Add the production redirect URI to your Google OAuth credentials in Google Cloud Console, then reconnect Gmail in Settings.

---

## Project Structure

```
app/
├── (auth)/login/          Login page
├── (app)/
│   ├── layout.tsx         Protected layout with sidebar nav
│   ├── dashboard/         Overview stats
│   ├── leads/             Google Places search + saved searches
│   ├── companies/         Company list + manual add
│   │   └── [id]/          Company detail + AI enrichment + add contact
│   ├── contacts/          Full contact database + CSV export
│   ├── campaigns/
│   │   ├── new/           Campaign builder (multi-step, mixed types)
│   │   └── [id]/          Campaign detail + approval + launch
│   ├── analytics/         Campaign performance metrics
│   └── settings/          Agency profile + Gmail OAuth
├── api/
│   ├── auth/              Login, logout, Gmail OAuth callback
│   ├── companies/         CRUD + /[id]/enrich
│   ├── contacts/          CRUD + /export (CSV)
│   ├── campaigns/         CRUD + /[id]/send (launch)
│   ├── track/             /open/[token] pixel, /click/[token] redirect
│   └── cron/              /process-scheduled, /poll-replies
lib/
├── db.ts                  Prisma client (adapter-pg pattern)
├── claude.ts              AI enrichment (Haiku) + copy generation (Sonnet)
├── gmail.ts               Gmail send + reply polling
├── places.ts              Google Places text search
├── tracking.ts            Token generation + HTML injection
└── cron.ts                node-cron job registration (hourly + 10min)
prisma/
└── schema.prisma          Full database schema
```

---

## Environment Variable Reference

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the login password |
| `SESSION_SECRET` | Random string for iron-session encryption (32+ chars) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_PLACES_API_KEY` | Google Places API (New) key |
| `GMAIL_CLIENT_ID` | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth client secret |
| `GMAIL_REDIRECT_URI` | OAuth callback URL — must match Google Cloud Console exactly |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (used in tracking pixel and click links) |
