# @truthlocks/maip-github-action

Generate and verify MAIP receipts for GitHub events — commits, PRs, releases, and CI runs. Every code change gets a cryptographic proof of who did what, when, and why.

## Quick Start

```yaml
name: Generate MAIP Receipts
on: [push, pull_request]

jobs:
  receipt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: truthlocks/maip-github-action@v1
        with:
          api-key: ${{ secrets.TRUTHLOCKS_API_KEY }}
          events: commit,pr
          algorithm: Ed25519
```

## Get an API Key (Free)

```bash
# Register in 5 seconds — no website needed:
npx @truthlocks/protect register --email dev@example.com
# → Save the tl_test_* key as a GitHub Secret (TRUTHLOCKS_API_KEY)
```

Free tier: 100 receipts/month. Upgrade at [console.truthlocks.com](https://console.truthlocks.com/upgrade).

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api-key` | Yes | — | Truthlocks API key (`tl_test_*` or `tl_live_*`) |
| `events` | No | `commit` | Comma-separated: `commit`, `pr`, `release`, `ci` |
| `algorithm` | No | `Ed25519` | Signing algorithm (Ed25519, ES256, ES384, ES512, RS256, RS384, RS512, PS256, PS384, PS512) |
| `verify` | No | `true` | Verify receipt chain integrity after generation |
| `badge` | No | `true` | Generate verification badge for PR comments |
| `fail-on-break` | No | `false` | Fail the workflow if chain integrity is broken |

## Outputs

| Output | Description |
|--------|-------------|
| `receipt-id` | UUID of the generated receipt |
| `attestation-id` | UUID of the signed attestation |
| `chain-valid` | `true` if the receipt chain is valid |
| `badge-url` | URL of the generated verification badge |
| `verify-url` | Public verification link |

## Events

### Commit Receipts
Every push generates a receipt containing:
- Commit SHA, author, message
- Files changed (additions/deletions)
- Timestamp with cryptographic proof
- Link to parent receipt (chain)

### PR Receipts
Pull request events generate receipts for:
- PR creation, merge, close
- Review approvals
- CI check results

### Release Receipts
Tag/release events generate receipts containing:
- Release version, name, body
- Associated commit SHA
- Build artifacts hash

### CI Receipts
Workflow completion generates receipts for:
- Job status (pass/fail)
- Duration, runner info
- Artifact checksums

## Supported Algorithms

| Algorithm | Best For |
|-----------|----------|
| Ed25519 | Default. Fastest signatures |
| ES256 | Web standard compatibility |
| ES384 | Government/CNSA Suite compliance |
| PS256 | Modern RSA (NIST recommended) |
| RS256 | Legacy PKI interop |

## Verification

Receipts are publicly verifiable:
```bash
# Verify via CLI
npx @truthlocks/protect verify --id RECEIPT_UUID

# Verify via API
curl https://api.truthlocks.com/v1/verify -d '{"attestation_id":"UUID"}'

# Verify on web
# https://verify.truthlocks.com?id=RECEIPT_UUID
```

## Links

- [Documentation](https://docs.truthlocks.com/guides/protect-action)
- [MAIP Specification](https://docs.truthlocks.com/guides/machine-identity)
- [Console](https://console.truthlocks.com)
- [GitHub](https://github.com/truthlocks)

## License

MIT
