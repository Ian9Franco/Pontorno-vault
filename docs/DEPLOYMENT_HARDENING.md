# Deployment Hardening

A web vault downloads part of its trusted computing base on every visit. Protecting the database while leaving the deployment path weak is insufficient.

## Accounts that require phishing-resistant MFA/passkeys

- primary Google account;
- GitHub owner/maintainer account;
- Vercel/deployment account;
- Supabase project administrators;
- DNS/domain registrar.

Where supported, prefer passkeys or hardware-backed security keys over SMS.

## GitHub

- Require the Security Gate workflow before merge.
- Protect `main`; disallow direct pushes for normal development.
- Require pull requests and review for security-sensitive changes.
- Enable secret scanning / push protection where available.
- Keep Dependabot enabled for npm and GitHub Actions.
- Do not run untrusted fork code with privileged `pull_request_target` workflows.

## Build / deploy

- Deploy from protected commits only.
- Use `npm ci`, never opportunistic install fallback.
- Do not inject analytics, session replay, tag managers or unrelated third-party scripts into unlocked vault routes.
- Treat a deployment credential compromise as a potential plaintext compromise at the next user unlock.
- Preserve immutable deployment history so an unexpected release can be identified and rolled back quickly.

## Supabase

- Run Security Advisors after every schema/RLS/RPC change.
- Keep RLS enabled on every exposed table.
- Keep privileged `SECURITY DEFINER` functions outside exposed schemas where possible, with fixed `search_path` and explicit grants.
- Enable leaked password protection while password auth remains available.
- Keep the OTP inbox closed until it has provider authentication, tenant binding, TTL, replay protection and rate limits.

## Browser

- Maintain nonce-based CSP with a narrow `connect-src`.
- Never fetch remote resources whose URL is derived from decrypted vault content.
- Regularly test the production build for CSP violations and accidental external requests while the vault is unlocked.
