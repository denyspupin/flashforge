# Security

If you have found a security issue in FlashForge, **please do not file a public issue or pull request**. Public disclosure before a fix is in place puts every user at risk.

## Reporting a vulnerability

Email: **security@denyspupin.dev** (placeholder — replace before public release; see [`docs/PUBLIC_RELEASE_PLAN.md`](./PUBLIC_RELEASE_PLAN.md) Phase 0).

Please include:

- A short description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept.
- Affected versions or commits, if known.
- Your name and a way to follow up, if you would like credit in the changelog.

You can expect an acknowledgement within 72 hours. Fix timelines depend on severity.

## What is in scope

- Authentication and session handling (Clerk misconfiguration, JWT leakage).
- Authorisation (any way for a non-owner to read or mutate another user's decks, cards, collections, study sessions, notifications, or admin resources).
- Webhook signature verification (Svix bypass on `/api/webhooks/clerk`).
- Injection (SQL injection, XSS, stored XSS in deck titles or card text).
- Sensitive data exposure (API endpoints that leak private data to non-owners).
- Cross-tenant data leakage in shared infrastructure.
- Dependency vulnerabilities that are reachable from the production app.

## What is out of scope

- Denial of service against the production app.
- Issues in third-party services (Clerk, Neon, Vercel) — report upstream.
- Rate-limiting complaints about public read endpoints.
- "Best practice" suggestions that don't have a concrete attack.

## Safe harbour

Good-faith research that respects the reporting channel above is welcome. Don't access other users' data, don't disrupt the service, and don't exfiltrate more than you need to demonstrate the bug.

## Notes for the owner

- Rotate any leaked secret immediately (see `docs/DEPLOYMENT.md` for the Clerk / Neon / Vercel rotation steps).
- After fixing, push a commit that closes the issue without revealing exploit details in the public commit message.
- Enable GitHub secret scanning, push protection, and Dependabot security updates on the public repository before flipping visibility. The release plan Phase 7 covers this.
