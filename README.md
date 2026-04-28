# AssistAI — Deployment Guide

AI assistant SaaS for Francophone West Africa, built on Next.js + Anthropic Claude.

---

## Prerequisites

- Node.js 20+ (`node --version`)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- An [Anthropic API key](https://console.anthropic.com)
- A Gmail account (or any SMTP provider) for email notifications

---

## Step-by-step deployment (zero DevOps required)

### 1. Fork / clone this repo

```bash
git clone <your-repo-url>
cd assistai
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Pick a name and a strong database password
3. Once created, go to **Project Settings → Database**
4. Copy the **Connection string (URI)** under "Connection pooling" — it looks like:
   `postgresql://postgres.xxxx:password@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`
5. Append `?pgbouncer=true&connection_limit=1` to the URL (required for serverless)

### 3. Create a Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub/GitLab repo
3. Framework preset: **Next.js** (auto-detected)
4. Do **not** deploy yet — add env vars first (step 4)

### 4. Add environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic key (`sk-ant-...`) |
| `DATABASE_URL` | Supabase connection string from step 2 |
| `NEXTAUTH_SECRET` | Any random 32+ character string (use `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your Vercel deployment URL (e.g. `https://assistai.vercel.app`) |
| `ADMIN_EMAIL` | Email where access requests are sent |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password ([get one here](https://myaccount.google.com/apppasswords)) |
| `NEXT_PUBLIC_APP_NAME` | Your brand name (default: `AssistAI`) |
| `NEXT_PUBLIC_APP_TAGLINE` | Your tagline |

### 5. Push the database schema

On your local machine:

```bash
# Install dependencies
npm install

# Set DATABASE_URL in your local .env file (copy from Supabase)
# Then push the schema:
npx prisma db push
```

### 6. Create the first admin user

```bash
npx prisma db seed
```

This creates:
- Admin: `admin@yourdomain.com` / `changeme123`
- Test user: `test@demo.com` / `test123`

**Change these passwords immediately after first login.**

### 7. Deploy

```bash
git add .
git commit -m "Initial deploy"
git push
```

Vercel picks up the push and auto-deploys. Visit your Vercel URL when the build completes.

---

## Local development

```bash
# Copy and fill in your .env
cp .env .env.local   # fill in real values

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Branding customisation

Change `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_TAGLINE` in Vercel env vars — no code changes needed.

To change colours, edit the `indigo` references in the Tailwind classes inside `components/`.

---

## Adding users

Users cannot self-sign-up (by design — access is invite-only). To add a user:

1. Open Prisma Studio: `npx prisma studio`
2. Navigate to the `User` table → **Add record**
3. Fill in `email`, `passwordHash` (use `bcrypt.hashSync("password", 12)` in Node), `tenantId`, `role`

Or run a quick seed extension in `prisma/seed.ts`.

---

## Architecture

```
app/
  page.tsx          — Landing page (unauthenticated)
  login/page.tsx    — Login form
  chat/page.tsx     — Main chat interface
  admin/page.tsx    — Admin dashboard
  api/
    auth/           — NextAuth credentials handler
    chat/           — Streaming Claude API proxy
    conversations/  — Conversation CRUD
    admin/          — Admin stats & user management
    access-request/ — Email notification for access requests

components/
  LandingPage.tsx   — Public marketing page with access request modal
  LoginForm.tsx     — Email + password login
  ChatInterface.tsx — Full chat UI with sidebar
  AdminDashboard.tsx— Admin stats, user table, usage chart

lib/
  prisma.ts         — Prisma client singleton (PostgreSQL via adapter)
  auth.ts           — NextAuth config
  system-prompt.ts  — Claude system prompt (baked into every request)

prisma/
  schema.prisma     — Database schema (Tenant, User, Conversation, Message)
  seed.ts           — Creates default tenant + admin user
```

---

## Cost model (reference)

| Layer | Rate |
|---|---|
| Anthropic claude-sonnet-4 input | ~$3 / 1M tokens |
| Anthropic claude-sonnet-4 output | ~$15 / 1M tokens |
| Blended (estimated) | ~$10 / 1K tokens |
| Suggested client billing | 5× markup |
| Vercel (hobby) | Free up to 100GB bandwidth |
| Supabase (free tier) | 500MB DB, 2GB bandwidth |
