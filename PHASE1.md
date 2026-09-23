# Phase 1 foundation

## Run locally

Terminal 1:

```text
cd server
copy .env.example .env
npm install
npm run dev
```

Terminal 2:

```text
cd frontend
copy .env.example .env
npm install
npm start
```

MongoDB must be reachable and `server/.env` must contain a valid `MONGO_URI` and a random `JWT_SECRET`. Add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` for live question, pillar, and calendar generation. ConvertKit is optional; configure `CONVERTKIT_API_KEY` and `CONVERTKIT_TAG_ID` to retain signup synchronization.

## Migrated behavior

- Signup, login, authenticated session bootstrap, and logout
- Existing five-stage onboarding: business details, platforms, questions, pillars, calendar
- Authenticated AI generation boundary with the legacy free-plan usage guard
- Save, list, and load calendars scoped to the authenticated user
- Show Up branding, responsive forms, post list, copy action, and saved calendar panel

## Data note

The supplied Cloudflare worker used D1 tables, while this project specifies MongoDB. No destructive migration was run. Existing D1 data needs an explicit one-time export/import mapping before production cutover; this refactor does not touch the production Cloudflare application.

## Deliberately deferred

Growth Academy invitations and entitlements, admin controls, password reset, persistent onboarding profiles, Skool, Stripe, and product redesign remain outside Phase 1.

## Verification checklist

- `cd frontend && npm test -- --watchAll=false`
- `cd frontend && npm run build`
- `cd server && node --check src/index.js`
- With MongoDB and environment configured: register, log in, complete onboarding, generate, save, reload, and log out.
