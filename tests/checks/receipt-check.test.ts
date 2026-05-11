/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for receipt check run creation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReceiptCheck } from "../../src/checks/receipt-check.js";
import type {
  ReceiptResponse,
  VerifyReceiptResponse,
} from "../../src/types.js";

vi.mock("@actions/core", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@actions/github", () => ({
  context: {
    repo: { owner: "truthlocks", repo: "maip" },
    sha: "test-sha-123",
    payload: {},
    eventName: "push",
  },
  getOctokit: vi.fn(),
}));

const mockReceipt: ReceiptResponse = {
  receipt_id: "rcpt-test-001",
  tenant_id: "tenant-001",
  agent_id: "agent-ci",
  action: "github.commit.abc12345",
  receipt_type: "action",
  payload: {},
  inputs_hash: "inputs-hash-abc",
  outputs_hash: "outputs-hash-def",
  delegation_chain_hash: "chain-hash-0123456789abcdef0123456789abcdef",
  attestation_id: "att-001",
  previous_receipt_id: null,
  status: "COMPLETE",
  duration_ms: 42,
  error_code: null,
  created_at: "2026-04-07T00:00:00Z",
  updated_at: "2026-04-07T00:00:00Z",
};

function createMockOctokit(): {
  rest: { checks: { create: ReturnType<typeof vi.fn> } };
} {
  return {
    rest: {
      checks: {
        create: vi.fn().mockResolvedValue({ data: { id: 1 } }),
      },
    },
  };
}

describe("createReceiptCheck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a success check for a valid receipt", async () => {
    const octokit = createMockOctokit();
    const verification: VerifyReceiptResponse = {
      valid: true,
      verdict: "Receipt chain verified",
      details: "All hashes match",
      warnings: [],
    };

    await createReceiptCheck(
      octokit as unknown as ReturnType<
        typeof import("@actions/github").getOctokit
      >,
      mockReceipt,
      verification,
    );

    expect(octokit.rest.checks.create).toHaveBeenCalledOnce();
    const call = octokit.rest.checks.create.mock.calls[0][0];
    expect(call.owner).toBe("truthlocks");
    expect(call.repo).toBe("maip");
    expect(call.head_sha).toBe("test-sha-123");
    expect(call.conclusion).toBe("success");
    expect(call.name).toBe("MAIP Receipt Verification");
    expect(call.output.title).toBe("Receipt Verified Successfully");
  });

  it("should create a failure check for an invalid receipt", async () => {
    const octokit = createMockOctokit();
    const verification: VerifyReceiptResponse = {
      valid: false,
      verdict: "Chain hash mismatch",
      details: "Expected hash does not match computed hash",
      warnings: ["Attestation expired"],
    };

    await createReceiptCheck(
      octokit as unknown as ReturnType<
        typeof import("@actions/github").getOctokit
      >,
      mockReceipt,
      verification,
    );

    const call = octokit.rest.checks.create.mock.calls[0][0];
    expect(call.conclusion).toBe("failure");
    expect(call.output.title).toBe("Receipt Verification Failed");
    expect(call.output.text).toContain("Chain hash mismatch");
    expect(call.output.text).toContain("Attestation expired");
  });

  it("should include receipt details in the check output markdown", async () => {
    const octokit = createMockOctokit();
    const verification: VerifyReceiptResponse = {
      valid: true,
      verdict: "OK",
      details: "Verified",
      warnings: [],
    };

    await createReceiptCheck(
      octokit as unknown as ReturnType<
        typeof import("@actions/github").getOctokit
      >,
      mockReceipt,
      verification,
    );

    const call = octokit.rest.checks.create.mock.calls[0][0];
    const text = call.output.text as string;
    expect(text).toContain("rcpt-test-001");
    expect(text).toContain("agent-ci");
    expect(text).toContain("tenant-001");
    expect(text).toContain("chain-hash-0123456789abcdef0123456789abcdef");
    expect(text).toContain("att-001");
    expect(text).toContain("None (genesis)");
  });

  it("should show previous receipt link when chain has history", async () => {
    const octokit = createMockOctokit();
    const receiptWithPrevious: ReceiptResponse = {
      ...mockReceipt,
      previous_receipt_id: "rcpt-prev-001",
    };
    const verification: VerifyReceiptResponse = {
      valid: true,
      verdict: "OK",
      details: "Verified",
      warnings: [],
    };

    await createReceiptCheck(
      octokit as unknown as ReturnType<
        typeof import("@actions/github").getOctokit
      >,
      receiptWithPrevious,
      verification,
    );

    const call = octokit.rest.checks.create.mock.calls[0][0];
    expect(call.output.text).toContain("rcpt-prev-001");
    expect(call.output.text).not.toContain("None (genesis)");
  });

  it("should include summary with receipt ID and chain hash", async () => {
    const octokit = createMockOctokit();
    const verification: VerifyReceiptResponse = {
      valid: true,
      verdict: "OK",
      details: "OK",
      warnings: [],
    };

    await createReceiptCheck(
      octokit as unknown as ReturnType<
        typeof import("@actions/github").getOctokit
      >,
      mockReceipt,
      verification,
    );

    const call = octokit.rest.checks.create.mock.calls[0][0];
    expect(call.output.summary).toContain("rcpt-test-001");
    expect(call.output.summary).toContain("chain-hash-01234");
  });

  it("should handle GitHub API errors gracefully", async () => {
    const octokit = createMockOctokit();
    octokit.rest.checks.create.mockRejectedValue(
      new Error("GitHub API rate limit"),
    );

    const verification: VerifyReceiptResponse = {
      valid: true,
      verdict: "OK",
      details: "OK",
      warnings: [],
    };

    await expect(
      createReceiptCheck(
        octokit as unknown as ReturnType<
          typeof import("@actions/github").getOctokit
        >,
        mockReceipt,
        verification,
      ),
    ).resolves.toBeUndefined();
  });
});
