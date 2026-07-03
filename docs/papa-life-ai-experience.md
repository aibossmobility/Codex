# Papa Life AI Experience

## Purpose

The Papa Life AI Experience turns the website into an AI-powered coaching ministry for fathers of adult children. It gives visitors one clear place to receive guided coaching, take a fatherhood assessment, find resources, ask Tuesday Live questions, request prayer, create Bible studies, understand membership, and submit contact information.

The experience is grounded in Brian Keith Hill's Papa Life voice and the PAPA Framework: Purpose, Authority, Presence, and Alignment.

## Website Pages

- `/ai-coach` - full Papa Life AI Coach experience
- `/assessment` - existing PAPA self-assessment page
- `/resources` - AI resource finder mode
- `/books` - AI experience entry for book and chapter guidance
- `/podcast` - AI experience entry for podcast questions and follow-up resources
- `/tuesday-live` - Tuesday Live question assistant
- `/membership` - membership assistant
- `/contact` - contact and coaching conversation entry

The homepage includes a floating "Meet the Papa Life AI Coach" widget that opens immediately. `/papa-journey` includes a clear AI Coach CTA and the floating widget so the AI entry point is visible from the main funnel page.

## Current AI Mode

The site supports live provider mode and local guided mode. Production currently reports live AI through Anthropic. If no provider key is present, the same endpoints fall back to the Papa Life guided response engine.

That means:

- The visitor experience works with or without a live provider key.
- The coach uses live AI when a provider key is configured.
- Conversations, lead requests, and AI assessment reports are saved.
- The same API endpoints fall back to guided mode when provider access is unavailable.

## Supported AI Providers

The server supports these provider keys:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY` or `GOOGLE_GEMINI_API_KEY`

Optional model settings:

- `OPENAI_MODEL`
- `ANTHROPIC_MODEL`
- `GEMINI_MODEL`
- `DEFAULT_AI_PROVIDER`
- `PAPA_LIFE_SYSTEM_PROMPT_PATH`
- `DATABASE_URL`
- `ADMIN_NOTIFICATION_EMAIL`

Provider priority is OpenAI, then Anthropic, then Gemini, then local guided mode.

## Main Files

- `server/papa-ai-engine.ts` - Papa Life AI voice, provider support, assessment report logic, resource finder, and guided local responses
- `server/papa-life-system-prompt.md` - server-side Papa Life Master Skill style system prompt
- `server/index.ts` - API routes, database table setup, lead saving, assessment saving, interaction saving
- `client/src/pages/PapaAiExperience.tsx` - full AI experience page
- `client/src/components/PapaAiWidget.tsx` - homepage floating AI coach widget
- `client/src/pages/Home.tsx` - homepage integration
- `client/src/App.tsx` - website routes

## API Routes

- `GET /api/health` - deployment health check
- `GET /api/ai/status` - shows whether live AI is connected
- `GET /api/ai/assessment/questions` - returns the twenty-question fatherhood assessment
- `GET /api/ai/resources?q=...` - returns resource recommendations
- `POST /api/ai/chat` - sends a visitor message to the Papa Life AI Coach
- `POST /api/ai/assessment` - creates a personalized assessment report
- `POST /api/ai/leads` - saves a lead request
- `POST /api/leads` - also accepts the AI lead format for compatibility
- `GET /api/admin/papa-ai/interactions` - admin-only interaction history

Backward-compatible routes under `/api/papa-ai/...` remain available.

## Database Schema

The build adds:

```sql
CREATE TABLE IF NOT EXISTS papa_ai_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  first_name TEXT,
  email TEXT,
  phone TEXT,
  source_page TEXT,
  user_message TEXT,
  assistant_reply TEXT,
  conversation_summary TEXT,
  provider TEXT NOT NULL DEFAULT 'local',
  assessment_result_json TEXT,
  report_json TEXT,
  recommended_resources_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The AI experience also writes compatible lead and assessment information into the existing `intake_submissions` and `conversion_pipeline` tables.

## Prompt Architecture

The system prompt lives in `server/papa-life-system-prompt.md` and is loaded through `PAPA_LIFE_SYSTEM_PROMPT_PATH` when configured. If the file is unavailable, the server falls back to the embedded Papa Life prompt in `server/papa-ai-engine.ts`.

It instructs the AI to:

- Speak as the Papa Life AI Coach, the digital extension of Brian Keith Hill's coaching ministry
- Help fathers rebuild connection and restore trust
- Use Purpose, Authority, Presence, and Alignment
- Stay warm, biblical, direct, hopeful, masculine, practical, and non-shaming
- Listen first and avoid lectures
- Give clear next steps
- Avoid guarantees of reconciliation
- Route urgent safety situations away from coaching and toward immediate help

## Administrator Guide

Use the admin interaction endpoint to review recent AI conversations and lead activity:

`GET /api/admin/papa-ai/interactions`

The route requires existing admin login. Saved records include mode, visitor contact fields, question, response, provider, and creation time.

Use the admin integration status endpoint to confirm production wiring:

`GET /api/admin/integrations/status`

The route requires existing admin login. It reports live AI provider/KB status, payment provider/webhook readiness, CRM automation readiness, and email notification configuration without exposing secrets.

## Content Management Guide

Resource recommendations are managed in `server/papa-ai-engine.ts` inside `papaAiResources`.

Each resource includes:

- Title
- Type
- PAPA pillar
- Description
- Website path
- Keywords

The current curated list includes the external Brian Keith Hill pathway `Give. Listen. Love. Serve.` at `https://givlistenlove-7uppzn73.manus.space/` for fathers who need a clean next step around presence, listening, love, and serving without control.

Add future books, courses, podcast episodes, Bible studies, videos, and worksheets there first. When a full document library or vector search system is added later, keep this list as the curated "best first resources" layer.

## Current Repair Notes

- `/assessment` remains a private browser-only self-assessment. It links visitors to `/ai-coach` when they want the saved AI assessment/report path.
- Member billing falls back to the configured Boss Mobility checkout link when `STRIPE_SECRET_KEY` is absent, avoiding the broken Stripe-only error path.
- Automatic paid-status reconciliation can now use `POST /api/webhooks/member-paid` with `PAYMENT_WEBHOOK_SECRET`. Until FastPay/agent is configured to call that webhook, admins can still mark a member paid from CRM Console → Members after confirming external checkout.
- Admins can review recent payment reconciliation activity through CRM Console → Members and `GET /api/admin/payment-events`.
- The AI is grounded in `server/papa-life-system-prompt.md`, curated resources, and any master files configured through `PAPA_LIFE_KB_PATHS`. This is file-backed retrieval, not a full vector database yet.
- Default deployable master files now live at `data/papa-life-master-kb.txt` and `data/Papa_Life_Master_Skill.md`, so the KB can load even if `PAPA_LIFE_KB_PATHS` is not set.
- CRM/email verification still requires production credentials and a confirmed destination service. The app attempts CRM sync from AI assessment submissions when lead details are present.
- Admin email alerts now log every attempt to `notification_events`. Resend and SendGrid are supported through `RESEND_API_KEY` or `SENDGRID_API_KEY`.
- CRM Console → Settings now includes a production-readiness panel for AI, payment, CRM, and email configuration.
- CRM Console → Settings includes a test notification action for verifying the email path after deployment.
- CRM Console → Alerts is the no-email fallback inbox. Papa AI lead/assessment alerts are still saved there even when no email sender is configured.
- GoHighLevel connection is stored through CRM Console → Settings. Papa AI assessments with an email now upsert the contact into GHL with `papa_lead_assessment`, which matches the published GHL `Papa Life 10-Email Nurture` workflow trigger.
- Papa AI lead requests now upsert the contact into GHL with `papa_ai_lead` and `papa_life_ai` tags for filtering and follow-up.

## Deployment Guide

1. Build the site with the existing project build command.
2. Deploy the generated `dist` output and server bundle using the current website hosting process.
3. Set provider keys only in the production environment, never in source code.
4. Confirm `/api/health` returns JSON.
5. Confirm `/api/ai/status` returns the expected provider.
6. Open `/ai-coach` and send a test message.
7. Submit an assessment and verify the report is saved.

## Installation Guide

No new package dependencies were added. The build uses the existing React, Express, SQLite, and fetch stack.

To activate live AI later, add one provider key to the deployed server environment. The code will automatically detect it.

Recommended production environment:

```txt
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DEFAULT_AI_PROVIDER=openai
PAPA_LIFE_SYSTEM_PROMPT_PATH=/var/www/html/bossmobilelifecoach.com/server/papa-life-system-prompt.md
PAPA_LIFE_KB_PATHS=/var/www/html/bossmobilelifecoach.com/data/papa-life-master-kb.txt
DATABASE_URL=
ADMIN_NOTIFICATION_EMAIL=
ADMIN_NOTIFICATION_FROM=Papa Life <notifications@bossmobilelifecoach.com>
PUBLIC_APP_URL=https://bossmobilelifecoach.com
CHECKOUT_PAYMENT_LINK=
PAYMENT_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
GHL_API_TOKEN=
GHL_PRIVATE_INTEGRATION_TOKEN=
GHL_LOCATION_ID=
GHL_WEBHOOK_SECRET=
AUTOMATION_CLOUD_WEBHOOK_URL=
SENDGRID_API_KEY=
RESEND_API_KEY=
```

## Testing Checklist

- `/api/health` returns JSON.
- `/api/ai/status` returns JSON, not homepage HTML.
- `/api/ai/chat` returns a Papa Life response and never exposes a provider key.
- `/api/ai/assessment/questions` returns twenty questions.
- `/api/ai/assessment` returns a report with focus pillar and resources.
- `/api/ai/leads` saves name, email, optional phone, source page, and assessment/conversation context.
- `/api/admin/integrations/status` shows AI, payment, CRM, and email readiness for logged-in admins.
- `/api/admin/notification-events` shows recent admin email notification logs for logged-in admins.
- `/api/admin/notifications/test` sends/logs a test admin notification for logged-in admins.
- `/api/admin/payment-events` shows recent member payment reconciliation logs for logged-in admins.
- `/api/webhooks/member-paid` returns 503 until `PAYMENT_WEBHOOK_SECRET` is set, then marks matching members paid when called with the secret.
- `/ai-coach` works on desktop and mobile.
- The homepage widget opens, closes, shows loading state, and handles errors.
- `papalifecoach.com` is allowed as an API origin when it points to this backend.

## User Guide

Visitors can:

- Ask the coach a fatherhood question
- Take the twenty-question assessment
- Ask for resources
- Submit Tuesday Live questions
- Ask for membership guidance
- Generate a personalized prayer
- Generate a Bible study using observation, interpretation, application, reflection, and prayer
- Leave contact information for the next step

## Security Notes

- API keys are never stored in frontend code.
- Live provider calls happen only from the server.
- Visitor inputs are trimmed before saving.
- Admin conversation review requires authentication.
- The coach includes safety boundaries for crisis, abuse, self-harm, violence, legal, medical, and therapy-adjacent situations.

## Future Extensions

- Add document upload and indexing for Papa Life books, transcripts, Bible studies, and worksheets.
- Add vector search for deeper resource retrieval.
- Add Stripe membership plan display inside the membership assistant.
- Add Mailchimp or ConvertKit sync from `POST /api/papa-ai/lead`.
- Add Google Analytics and Tag Manager events for mode switches, assessment completion, and lead requests.
- Add Cloudflare rate limiting in front of public AI endpoints.
