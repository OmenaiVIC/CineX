# Contributing to CineX

## Development Setup

### Prerequisites
- Node.js >= 18
- Clarinet CLI (for Clarity contracts)
- Backend: Express + SQLite (dev) / Neon PostgreSQL (prod)

### Getting Started
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Run contract tests
npm test

# Run backend tests
cd backend && npx vitest run && cd ..

# Run frontend tests
cd app && npx vitest run && cd ..

# Start devnet
clarinet devnet start
```

## Project Structure

```
CineX/
├── contracts/           # 27 Clarity smart contracts
│   ├── .base/           # Base contracts (sip-010, trait, owned)
│   ├── .admin/          # Admin utilities
│   ├── .campaign/       # Campaign lifecycle
│   ├── .crowdfunding/   # Crowdfunding pool
│   ├── .escrow/         # Milestone escrow
│   ├── .funding-pool/   # Funding pool
│   ├── .milestone/      # Milestone verification
│   ├── .oracle/         # Oracle proxy
│   ├── .reputation/     # Reputation & KYC
│   ├── .strategy/       # Strategy
│   └── .verification/   # Project verification
├── backend/             # Express API server
│   ├── src/
│   │   ├── config/      # Chain config, database
│   │   ├── middleware/   # Auth, relay, error handling
│   │   ├── routes/      # API routes (profiles, campaigns, pools, etc.)
│   │   └── services/    # Business logic (contractService, indexerWorker, etc.)
│   └── tests/           # Backend unit tests
├── app/                 # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # React hooks
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── types/       # TypeScript types
│   └── vitest.config.js
├── tests/               # Contract integration tests
└── docs/                # Documentation
```

## Code Style

### Clarity Contracts
- Use `define-public` for all user-facing functions
- Return `(ok true)` on success, `(err uNNN)` on failure
- Error codes: campaign-module u300–u322, milestone-escrow u5400–u5423, etc.
- Run `clarinet check` before committing

### Backend (JavaScript)
- ES modules (`import`/`export`)
- Dual-write pattern: SQLite first, then on-chain (try/catch — chain failure never blocks)
- All chain config from `backend/src/config/chain.js` (no hardcoded addresses)
- Tests in `backend/tests/*.test.js`

### Frontend (TypeScript/React)
- Functional components with hooks
- Tests in `*.test.tsx` or `*.test.ts`
- Use `@testing-library` for DOM tests

## Testing Requirements

### Contract Tests
- All 27 contracts must pass `clarinet check`
- Integration tests in `tests/integration.test.ts`
- Individual contract tests in `tests/*.test.ts`

### Backend Tests
- All routes must have corresponding tests
- Mock external services (Hiro API, Yellow Card, xReserve)
- Test both success and error paths

### Frontend Tests
- Component rendering tests
- User interaction tests (click, form submission)
- Mock API responses

## PR Process

1. Create feature branch from `main`
2. Make changes with tests
3. Run all test suites
4. Update documentation if needed
5. Submit PR with clear description
6. Address review feedback
7. Merge after approval

## Evidence Artifacts

For audit purposes, maintain evidence in `docs/evidence/`:
- `docs/evidence/index.md` — master index of all deliverables
- `docs/evidence/` — one `.md` per sub-section (§10.1, §10.2, etc.)
- Include: file paths, line numbers, test commands, output snippets

## Common Tasks

### Adding a New Contract
1. Write contract in `contracts/`
2. Add to `Clarinet.toml` with correct `depends_on`
3. Add to `backend/src/config/chain.js` if needed
4. Write tests in `tests/`
5. Run `clarinet check` and `npm test`

### Adding a Backend Route
1. Create route in `backend/src/routes/`
2. Import and mount in `backend/src/index.js`
3. Write tests in `backend/tests/`
4. Update contractService if on-chain calls needed

### Adding a Frontend Component
1. Create component in `app/src/components/`
2. Export from component directory
3. Write tests in same directory
4. Import in page component
