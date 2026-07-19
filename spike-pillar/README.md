# CineX Pillar Passkey Spike — Path A Scaffold

**Status**: COMPLETE — Go/No-Go: CONDITIONAL GO (Path A: Pillar-Only)

## What This Is

Spike scaffold proving P-256 passkey wallet viability on Stacks testnet for non-crypto creative users. No browser extension, no seed phrase — just biometric authentication via WebAuthn.

## Architecture

```
Frontend (P-256 passkey) → CineX Backend (secp256k1 relay) → Stacks Blockchain
```

- **P-256 keys**: WebAuthn auth factors only — NOT used for address derivation
- **User address**: Vault contract address (`ST{deployer}.cinex-smart-vault-{userId}`)
- **Dual-key**: P-256 owner signature validated on-chain, secp256k1 relay signs the Stacks transaction

## Quick Start

```bash
npm install
npm test          # 27/27 tests passing
clarinet check    # 0 errors, 2 warnings (cosmetic)
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@noble/curves` | ^2.2.0 | P-256 keypair generation, signing, verification |
| `@stacks/transactions` | ^6.17.0 | Stacks transaction building + Hiro API broadcast |
| `@stacks/network` | ^6.17.0 | Stacks testnet network config |
| `clarinet` | 3.21.1 | Clarity 4 / epoch 3.3 contract compilation |

## Clarity Contracts

| Contract | Lines | Purpose |
|----------|-------|---------|
| `clarity-webauthn.clar` | 182 | P-256 signature verifier (`secp256r1-verify`) |
| `cinex-smart-vault.v3` | 119 | Vault with `owner-pubkey` validation + anti-replay map |

## Testnet Deployments

| Contract | Address |
|----------|---------|
| clarity-webauthn | `ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.clarity-webauthn` |
| cinex-smart-vault-v3 | `ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault-v3` |

## E2E Proof (Testnet)

- Block 4045569: Onboard with P-256 owner pubkey stored on-chain
- Block 4045570: `stx-transfer` — P-256 signature validated against stored owner pubkey, 1 STX transferred

## Structure

```
spike-pillar/
├── contracts/
│   ├── clarity-webauthn.clar    # P-256 verifier
│   └── cinex-smart-vault.clar   # Vault v3 (owner-pubkey validation)
├── src/
│   ├── pillar-account.ts        # P-256 keypair generation
│   ├── pillar-address.ts        # Vault address derivation (pure computation)
│   ├── pillar-auth.ts           # WebAuthn challenge/authenticator builders
│   ├── pillar-deploy.ts         # Contract deploy + onboard via Hiro API
│   ├── pillar-sign.ts           # P-256 signing + verification
│   └── pillar-broadcast.ts      # Hiro API broadcast + status polling
├── scripts/
│   ├── deploy-testnet.mjs       # Two-contract sequential deploy
│   ├── deploy-v3.mjs            # Vault v3 only (clarity-webauthn assumed live)
│   ├── e2e-transfer.mjs         # Full E2E: deploy → onboard → P-256 signed transfer
│   └── onboard-user.mjs         # Onboard P-256 keypair to vault
├── tests/
│   ├── account.test.ts          # 3 tests — keypair generation
│   ├── address.test.ts          # 5 tests — address derivation
│   ├── auth.test.ts             # 4 tests — WebAuthn flow
│   ├── broadcast.test.ts        # 2 tests — broadcast + status
│   ├── deploy.test.ts           # 4 tests — contract source + Clarinet config
│   ├── relay.test.ts            # 4 tests — end-to-end relay flow
│   └── sign.test.ts             # 5 tests — signing + verification
└── Clarinet.toml                # Clarity 4 / epoch 3.3
```

## Key Findings

- `@clarity-webauthn/sdk` does NOT exist on npm — implemented P-256 directly via `@noble/curves`
- `@stacks/transactions` v7.5.0 is broken for deployment — use v6.17.0
- Hybrid approach (P-256 + secp256k1) is mathematically impossible — different curves
- Clarity 4 + epoch 3.3 — only working combo for `secp256r1-verify`
- `as-contract` removed in Clarity 4/epoch 3.3 — vault uses relay-as-sender pattern
- `stx-transfer?` rejects sender == recipient — must send to different address

## DoD

See [spike document](../docs/spikes/pillar-passkey-spike.md) Section 11 for full Definition of Done.
