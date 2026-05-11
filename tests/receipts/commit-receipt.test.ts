/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for commit receipt generation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCommitPayload } from "../../src/receipts/commit-receipt.js";
import { computePayloadHash, canonicalJson } from "../../src/receipts/utils.js";

vi.mock("@actions/core", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@actions/github", () => ({
  context: {
    repo: { owner: "truthlocks", repo: "maip" },
    sha: "abc123def456789abc123def456789abc123def4",
    ref: "refs/heads/main",
    payload: {
      head_commit: {
        author: { name: "Test Author" },
        committer: { name: "Test Committer" },
        message: "feat: add new feature",
        tree_id: "tree-sha-123",
      },
    },
    eventName: "push",
  },
  getOctokit: vi.fn(),
}));

function createMockOctokit(
  overrides?: Partial<Record<string, unknown>>,
): ReturnType<typeof import("@actions/github").getOctokit> {
  return {
    rest: {
      repos: {
        getCommit: vi.fn().mockResolvedValue({
          data: {
            commit: {
              author: { name: "Test Author" },
              committer: { name: "Test Committer" },
              message: "feat: add new feature",
              tree: { sha: "tree-sha-123" },
            },
            author: { login: "testauthor" },
            committer: { login: "testcommitter" },
            parents: [{ sha: "parent-sha-001" }],
            stats: { additions: 50, deletions: 10 },
            files: [
              { status: "added", filename: "src/new.ts" },
              { status: "modified", filename: "src/existing.ts" },
              { status: "modified", filename: "src/other.ts" },
              { status: "removed", filename: "src/old.ts" },
            ],
            ...overrides,
          },
        }),
      },
    },
  } as unknown as ReturnType<typeof import("@actions/github").getOctokit>;
}

describe("buildCommitPayload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should build a commit receipt with correct metadata", async () => {
    const octokit = createMockOctokit();
    const payload = await buildCommitPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.receipt_type).toBe("github_commit_receipt");
    expect(payload.agent_id).toBe("agent-ci");
    expect(payload.tenant_id).toBe("tenant-001");
    expect(payload.repository).toBe("truthlocks/maip");
    expect(payload.commit_sha).toBe("abc123def456789abc123def456789abc123def4");
    expect(payload.branch).toBe("main");
    expect(payload.author).toBe("Test Author");
    expect(payload.committer).toBe("Test Committer");
    expect(payload.message).toBe("feat: add new feature");
  });

  it("should compute correct file change counts", async () => {
    const octokit = createMockOctokit();
    const payload = await buildCommitPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.files_added).toBe(1);
    expect(payload.files_modified).toBe(2);
    expect(payload.files_removed).toBe(1);
    expect(payload.additions).toBe(50);
    expect(payload.deletions).toBe(10);
  });

  it("should compute a deterministic SHA-256 payload hash", async () => {
    const octokit = createMockOctokit();
    const payload = await buildCommitPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.payload_hash).toMatch(/^[a-f0-9]{64}$/);

    const { payload_hash: _hash, timestamp: _ts, ...rest } = payload;
    const recomputedPayload = { ...rest, timestamp: payload.timestamp };
    const expectedHash = computePayloadHash(canonicalJson(recomputedPayload));
    expect(payload.payload_hash).toBe(expectedHash);
  });

  it("should include parent SHAs from commit data", async () => {
    const octokit = createMockOctokit();
    const payload = await buildCommitPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.parent_shas).toEqual(["parent-sha-001"]);
    expect(payload.tree_sha).toBe("tree-sha-123");
  });

  it("should fall back to push payload when API call fails", async () => {
    const octokit = {
      rest: {
        repos: {
          getCommit: vi.fn().mockRejectedValue(new Error("API unavailable")),
        },
      },
    } as unknown as ReturnType<typeof import("@actions/github").getOctokit>;

    const payload = await buildCommitPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.author).toBe("Test Author");
    expect(payload.committer).toBe("Test Committer");
    expect(payload.message).toBe("feat: add new feature");
    expect(payload.tree_sha).toBe("tree-sha-123");
    expect(payload.files_added).toBe(0);
    expect(payload.files_modified).toBe(0);
    expect(payload.files_removed).toBe(0);
  });

  it("should set timestamp as ISO 8601 string", async () => {
    const octokit = createMockOctokit();
    const payload = await buildCommitPayload(octokit, "agent-ci", "tenant-001");

    const parsed = Date.parse(payload.timestamp);
    expect(isNaN(parsed)).toBe(false);
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
