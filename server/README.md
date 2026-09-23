# Show Up API

Node/Express backend for the React application. MongoDB is the source of truth for users and calendars.

## Local setup

1. Copy `.env.example` to `.env` and set `JWT_SECRET` and `MONGO_URI`.
2. Install dependencies with `npm install`.
3. Start the API with `npm run dev` (or `npm start`). Development uses `nodemon` and restarts after source changes.

The API listens on `http://localhost:4000` by default. Sensitive values stay in the server environment: JWT secret, MongoDB credentials, Anthropic key, and ConvertKit credentials. `GET /health` verifies database connectivity without exposing configuration.

## API surface

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/generate`
- `POST /api/calendar/save`
- `GET /api/calendars`
- `GET /api/calendar/:id`

`POST /api/generate` requires a bearer token and calls Anthropic. It preserves the legacy free-plan usage guard at 25 requests. Calendar documents are stored under the authenticated MongoDB user id.

The Anthropic model is controlled by `ANTHROPIC_MODEL`; the example defaults to `claude-sonnet-4-6`. Use a model enabled for your Anthropic account. `AI_TIMEOUT_MS` defaults to 90000 and can be lowered or raised up to 120000. Set `LOG_LEVEL=debug` during development or `LOG_LEVEL=info` in production. Development logs are human-readable; production logs are JSON for log aggregation. Logs include request IDs, route, status, duration, database connection lifecycle, and AI lifecycle. Passwords, tokens, request bodies, connection strings, and API keys are deliberately excluded.

## Growth Academy access foundation

Phase 3 adds hashed, expiring invitations and server-side `GROWTH_ACADEMY` entitlements. Configure `INVITATION_EXPIRY_DAYS`, `PUBLIC_APP_URL`, and `ADMIN_API_KEY`. Set `RESEND_API_KEY` and `EMAIL_FROM` to send transactional invitation email; ConvertKit signup synchronization remains supported. Admin invitation routes require the `X-Admin-Key` header and are backend-only until Phase 4.

- `POST /api/admin/invitations`
- `GET /api/admin/invitations`
- `POST /api/admin/invitations/:id/resend`
- `POST /api/admin/invitations/:id/revoke`
- `GET /api/invitations/validate?token=...`
- `POST /api/auth/invitation-register`
- `POST /api/auth/claim-invitation`
