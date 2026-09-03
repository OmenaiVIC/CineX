# Security Policy

CineX takes security seriously. This project is a **prototype / reference implementation** — the Clarity contracts are **not independently audited** and must **not** be trusted with real funds on mainnet.

## Reporting a Vulnerability

If you believe you have found a security vulnerability in this repository (code, contracts, or deployed services), please report it privately and responsibly:

- **Do not** open a public issue for security vulnerabilities.
- **Do not** disclose the details publicly until maintainers have had a chance to respond and remediate.

### How to report

Please **open a GitHub Security Advisory** via:

> **Repository → Security → Report a vulnerability**

Mark the report as confidential (private). Provide:

1. A clear description of the vulnerability.
2. The affected file(s)/contract(s) and version/commit.
3. Steps to reproduce (or a proof-of-concept), if possible.
4. Any suggested remediation.

Maintainers aim to respond within **5 business days**.

## Scope

The following are in scope:

- Smart contracts under `contracts/` (Clarity).
- Backend under `backend/` (Node/Express, BOS pipeline, relay, indexer).
- Frontends under `app/` and `cinex-canvas/`.
- Deployment configuration (Vercel, database, environment handling).

**Out of scope:** already-disclosed issues, anything that is a consequence of the project being an unaudited prototype, and third-party services that are outside this repository's control.

## Responsible Disclosure

We follow a coordinated-disclosure approach. We will acknowledge valid reports, coordinate a fix, and — with your consent — credit you for the discovery.

## Note on Email

This project does **not** use SMTP secrets in its deployed environment. Do not attempt to report security issues via any email addresses that may appear in documentation; use the GitHub Advisory flow above.
