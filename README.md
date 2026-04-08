# MAIP Receipt Generator

Generate and verify [MAIP](https://github.com/truthlocks/maip) receipts for GitHub events — commits, PRs, releases, CI runs.

The Machine Agent Identity Protocol (MAIP) provides cryptographic receipts that prove which AI agent performed an action, when, and under whose authority. This GitHub Action integrates MAIP into your CI/CD pipeline so every code change carries a verifiable chain of custody.

## Features

- **Receipt generation** for commits, tags, releases, and CI workflow runs
- **PR check runs** with verification status annotations
- **Trust score checks** showing agent reputation
- **Badge generation** for README status indicators
- **Matrix build support** with per-job receipt chains
- **Non-blocking** — MAIP errors are logged as warnings, never failing your build

## Quick Start

```yaml
- uses: truthlocks/maip-github-action@v1
  with:
    maip-api-key: ${{ secrets.MAIP_API_KEY }}
    maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `maip-api-key` | **Yes** | — | MAIP API key |
| `maip-tenant-id` | **Yes** | — | Tenant ID |
| `maip-api-url` | No | `https://api.truthlocks.com/v1/machine-identity` | MAIP API URL |
| `maip-agent-id` | No | Auto-generated from repo | Agent ID for this repository |
| `mode` | No | `receipt` | Operation mode: `receipt`, `verify`, `check`, `comment`, `badge` |
| `event-type` | No | `auto` | Event type: `commit`, `pr`, `release`, `ci`, `artifact` |
| `receipt-id` | No | — | Receipt ID to verify (required for `mode=verify`) |
| `create-check` | No | `true` | Create GitHub Check Run with results |
| `post-comment` | No | `true` | Post PR comment with receipt summary |
| `github-token` | No | `${{ github.token }}` | GitHub token for API calls |

## Outputs

| Output | Description |
|--------|-------------|
| `receipt-id` | Generated receipt ID |
| `receipt-hash` | Receipt chain hash |
| `verification-status` | Verification result: `valid`, `invalid`, `pending`, or `error` |
| `trust-score` | Agent trust score (0.0 - 1.0) |
| `badge-url` | URL of generated status badge (data URI) |

## Modes

### `receipt` (default)

Generates a MAIP receipt for the current GitHub event. The event type is auto-detected from the workflow trigger, or you can set it explicitly with `event-type`.

```yaml
- uses: truthlocks/maip-github-action@v1
  with:
    maip-api-key: ${{ secrets.MAIP_API_KEY }}
    maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
    mode: receipt
    event-type: commit
```

### `verify`

Verifies an existing receipt by ID and creates check runs with the result.

```yaml
- uses: truthlocks/maip-github-action@v1
  with:
    maip-api-key: ${{ secrets.MAIP_API_KEY }}
    maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
    mode: verify
    receipt-id: ${{ steps.generate.outputs.receipt-id }}
```

### `check`

Creates a GitHub Check Run showing the agent's trust score.

### `comment`

Posts a PR comment with the receipt summary. If no `receipt-id` is provided, generates a new receipt first.

### `badge`

Generates SVG badges for verification status and trust score, returned as data URIs in the `badge-url` output.

## Examples

### Receipt on push

```yaml
name: MAIP Receipt on Push
on: [push]

jobs:
  receipt:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: truthlocks/maip-github-action@v1
        with:
          maip-api-key: ${{ secrets.MAIP_API_KEY }}
          maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
          mode: receipt
          event-type: commit
```

### PR check with comment

```yaml
name: MAIP PR Check
on: [pull_request]

jobs:
  maip-check:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: truthlocks/maip-github-action@v1
        with:
          maip-api-key: ${{ secrets.MAIP_API_KEY }}
          maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
          mode: receipt
          event-type: pr
          create-check: "true"
          post-comment: "true"
```

### Release receipt

```yaml
name: MAIP Release Receipt
on:
  release:
    types: [published]

jobs:
  receipt:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: truthlocks/maip-github-action@v1
        with:
          maip-api-key: ${{ secrets.MAIP_API_KEY }}
          maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
          mode: receipt
          event-type: release
```

### CI workflow receipt

```yaml
name: MAIP CI Receipt
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

jobs:
  receipt:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      contents: read
      actions: read
    steps:
      - uses: truthlocks/maip-github-action@v1
        with:
          maip-api-key: ${{ secrets.MAIP_API_KEY }}
          maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
          mode: receipt
          event-type: ci
          create-check: "true"
```

### Verify a receipt

```yaml
name: MAIP Verify Receipt
on:
  workflow_dispatch:
    inputs:
      receipt-id:
        description: "Receipt ID to verify"
        required: true

jobs:
  verify:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      contents: read
      pull-requests: write
    steps:
      - uses: truthlocks/maip-github-action@v1
        with:
          maip-api-key: ${{ secrets.MAIP_API_KEY }}
          maip-tenant-id: ${{ secrets.MAIP_TENANT_ID }}
          mode: verify
          receipt-id: ${{ github.event.inputs.receipt-id }}
          create-check: "true"
          post-comment: "true"
```

## About MAIP

The Machine Agent Identity Protocol (MAIP) is an open specification for machine-to-machine identity, delegation, and audit. Learn more at [github.com/truthlocks/maip](https://github.com/truthlocks/maip).

## License

Apache-2.0
