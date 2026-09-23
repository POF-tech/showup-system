# Phase 3: Growth Academy Access Foundation

## Implemented

- Secure, random invitation tokens stored only as SHA-256 hashes.
- Invitation states: `PENDING`, `REDEEMED`, `REVOKED`, and `EXPIRED`.
- Configurable invitation expiry through `INVITATION_EXPIRY_DAYS`.
- MongoDB `invitations` and `entitlements` collections with indexes.
- Server-side `GROWTH_ACADEMY` entitlement checks.
- Free users are limited to one generated calendar; active Growth Academy entitlements are unlimited.
- Invited registration at `/register?token=...` with the email fixed by the invitation.
- Existing invited accounts receive the entitlement without a duplicate account and continue through normal login.
- Protected backend invitation routes for the future Phase 4 admin UI.
- Optional Resend transactional email delivery alongside existing ConvertKit signup sync.

## Backend routes

- `POST /api/admin/invitations` with `X-Admin-Key`
- `GET /api/admin/invitations` with `X-Admin-Key`
- `POST /api/admin/invitations/:id/resend` with `X-Admin-Key`
- `POST /api/admin/invitations/:id/revoke` with `X-Admin-Key`
- `GET /api/invitations/validate?token=...`
- `POST /api/auth/invitation-register`
- `POST /api/auth/claim-invitation` with normal bearer authentication

## Required production configuration

```env
INVITATION_EXPIRY_DAYS=7
PUBLIC_APP_URL=https://your-frontend-domain.com
ADMIN_API_KEY=long-random-admin-key
RESEND_API_KEY=your-resend-key
EMAIL_FROM=ShowUpp <no-reply@your-domain.com>
```

ConvertKit remains optional and continues to use `CONVERTKIT_API_KEY` and `CONVERTKIT_TAG_ID`.

## Deliberately deferred

Skool integration, payments, membership synchronization, and any Growth Academy application remain outside this project. The Phase 4 admin UI is implemented separately.

## Database safety

No existing users or calendars are deleted or migrated destructively. New MongoDB collections and indexes are created idempotently when the server connects.