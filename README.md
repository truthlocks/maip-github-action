# Truthlocks MAIP GitHub Action

Generate receipt requests from supported GitHub event metadata and optionally render check results or comments.

## Release readiness

Version 1.2.0 submits signed integration metadata through the current MAIP receipt API.
Live QA checks cover receipt creation, retrieval and signature verification; GitHub
event builders and failure handling are exercised with fixtures. Real check/comment
posting needs an explicitly selected test repository and appropriate GitHub permissions.
Failed delivery or invalid verification now fails the action. Full-chain and
transparency verification are not performed; the chain check reports neutral.

## Integration example

This snippet documents the declared input contract for a reviewed source checkout.
Run it first in an explicitly triggered QA workflow.
Use repository secrets for credentials and an explicitly triggered QA workflow.

```yaml
# Integration step for a reviewed local checkout with built dist/index.js.
# Place in an explicitly triggered test workflow after checkout/build.
- uses: ./packages/maip-github-action
  with:
    maip-api-url: https://sandbox-api.truthlocks.com/v1
    maip-api-key: ${{ secrets.TRUTHLOCKS_API_KEY }}
    maip-tenant-id: ${{ vars.TRUTHLOCKS_TENANT_ID }}
    maip-agent-id: ${{ vars.TRUTHLOCKS_AGENT_ID }}
    mode: receipt
    event-type: commit
    create-check: 'false'
    post-comment: 'false'
```

## Declared inputs

The names below match `action.yml`. Do not use older examples with undeclared inputs.

| Input | Required | Default | Meaning |
| --- | --- | --- | --- |
| `maip-api-url` | No | https://api.truthlocks.com/v1 | MAIP API URL |
| `maip-api-key` | Yes | — | MAIP API Key |
| `maip-tenant-id` | Yes | — | Tenant ID |
| `maip-agent-id` | For new receipts | � | Existing registered workspace agent ID |
| `mode` | No | receipt | Operation mode: receipt, verify, check, comment, badge |
| `event-type` | No | auto | Event type: commit, pr, release, ci, artifact |
| `receipt-id` | No | — | Receipt ID to verify (for mode=verify) |
| `create-check` | No | true | Create GitHub Check Run with results |
| `post-comment` | No | true | Post PR comment with receipt summary |
| `github-token` | No | ${{ github.token }} | GitHub token for API calls |

## Declared outputs

| Output | Meaning |
| --- | --- |
| `receipt-id` | Generated receipt ID |
| `receipt-hash` | Receipt chain hash |
| `verification-status` | Verification result (valid/invalid/pending) |
| `trust-score` | Agent trust score |
| `badge-url` | URL of generated status badge |

Outputs are not proof that a cryptographic verification occurred. Check the actual
operation result and fail the calling workflow on errors. Do not treat a displayed
badge, trust score or successful job exit as an independently verified signature.

## Build, permissions and testing

Review the action's runtime and entry point before packaging. Keep credentials out of
pull requests from untrusted forks. Grant GitHub write permissions only for features
you intentionally enable; check/comment features perform remote writes. Test a labeled
private QA artifact before enabling automation for real release artifacts.

## Troubleshooting

For unknown inputs, compare exact names with the table. For missing entry points,
inspect the packaged artifact rather than relying on local node_modules. For 404 or
verification failures, check the hosted route contract and identifier type. A retry
must not silently create duplicate receipts; preserve supported idempotency behavior.

[Protection CLI guide](https://docs.truthlocks.com/guides/protect-cli) ·
[Developer documentation](https://docs.truthlocks.com)
