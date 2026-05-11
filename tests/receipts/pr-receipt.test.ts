/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for PR receipt generation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPRPayload } from "../../src/receipts/pr-receipt.js";
import {
  computePayloadHash,
  canonicalJson,
  hashContent,
} from "../../src/receipts/utils.js";

vi.mock("@actions/core", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@actions/github", () => ({
  context: {
    repo: { owner: "truthlocks", repo: "maip" },
    sha: "head-sha-abc",
    ref: "refs/pull/42/merge",
    payload: {
      pull_request: {
        number: 42,
        title: "feat: implement MAIP receipts",
        body: "This PR implements the MAIP receipt generation system.",
        user: { login: "testuser" },
        base: { ref: "main" },
        head: { ref: "feature/maip-receipts", sha: "head-sha-abc" },
        commits: 3,
        changed_files: 12,
        additions: 200,
        deletions: 50,
        merge_commit_sha: null,
        state: "open",
      },
    },
    eventName: "pull_request",
  },
  getOctokit: vi.fn(),
}));

function createMockOctokit(): ReturnType<
  typeof import("@actions/github").getOctokit
> {
  return {
    rest: {
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: { login: "reviewer1" }, state: "APPROVED" },
            { user: { login: "reviewer2" }, state: "CHANGES_REQUESTED" },
            { user: { login: "reviewer1" }, state: "APPROVED" },
          ],
        }),
        listCommits: vi.fn().mockResolvedValue({
          data: [{ sha: "c1" }, { sha: "c2" }, { sha: "c3" }],
        }),
      },
    },
  } as unknown as ReturnType<typeof import("@actions/github").getOctokit>;
}

describe("buildPRPayload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should build a PR receipt with correct metadata", async () => {
    const octokit = createMockOctokit();
    const payload = await buildPRPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.receipt_type).toBe("github_pr_receipt");
    expect(payload.pr_number).toBe(42);
    expect(payload.title).toBe("feat: implement MAIP receipts");
    expect(payload.author).toBe("testuser");
    expect(payload.base_branch).toBe("main");
    expect(payload.head_branch).toBe("feature/maip-receipts");
    expect(payload.changed_files).toBe(12);
    expect(payload.additions).toBe(200);
    expect(payload.deletions).toBe(50);
    expect(payload.status).toBe("open");
  });

  it("should hash the PR body instead of storing raw content", async () => {
    const octokit = createMockOctokit();
    const payload = await buildPRPayload(octokit, "agent-ci", "tenant-001");

    const expectedBodyHash = hashContent(
      "This PR implements the MAIP receipt generation system.",
    );
    expect(payload.body_hash).toBe(expectedBodyHash);
    expect(payload.body_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should include deduplicated and sorted reviewer lists", async () => {
    const octokit = createMockOctokit();
    const payload = await buildPRPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.reviewers).toEqual(["reviewer1", "reviewer2"]);
    expect(payload.approved_by).toEqual(["reviewer1"]);
  });

  it("should compute a deterministic SHA-256 payload hash", async () => {
    const octokit = createMockOctokit();
    const payload = await buildPRPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.payload_hash).toMatch(/^[a-f0-9]{64}$/);

    const { payload_hash: _hash, timestamp: _ts, ...rest } = payload;
    const recomputedPayload = { ...rest, timestamp: payload.timestamp };
    const expectedHash = computePayloadHash(canonicalJson(recomputedPayload));
    expect(payload.payload_hash).toBe(expectedHash);
  });

  it("should handle missing PR reviews gracefully", async () => {
    const octokit = {
      rest: {
        pulls: {
          listReviews: vi.fn().mockRejectedValue(new Error("API error")),
          listCommits: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
    } as unknown as ReturnType<typeof import("@actions/github").getOctokit>;

    const payload = await buildPRPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.reviewers).toEqual([]);
    expect(payload.approved_by).toEqual([]);
    expect(payload.pr_number).toBe(42);
  });

  it("should set merge_commit_sha to null for unmerged PRs", async () => {
    const octokit = createMockOctokit();
    const payload = await buildPRPayload(octokit, "agent-ci", "tenant-001");

    expect(payload.merge_commit_sha).toBeNull();
  });

  it("should include repository and agent identifiers", async () => {
    const octokit = createMockOctokit();
    const payload = await buildPRPayload(
      octokit,
      "my-custom-agent",
      "custom-tenant",
    );

    expect(payload.agent_id).toBe("my-custom-agent");
    expect(payload.tenant_id).toBe("custom-tenant");
    expect(payload.repository).toBe("truthlocks/maip");
  });
});
