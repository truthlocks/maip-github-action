/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for the MAIP API client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MAIPClient, MAIPApiError, MAIPNetworkError } from "../src/client.js";

vi.mock("@actions/core", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

function createClient(
  overrides?: Partial<{
    apiUrl: string;
    apiKey: string;
    tenantId: string;
    maxRetries: number;
    timeoutMs: number;
  }>,
): MAIPClient {
  return new MAIPClient({
    apiUrl: "https://api.test.com/v1",
    apiKey: "test-api-key",
    tenantId: "test-tenant",
    maxRetries: 0,
    timeoutMs: 5000,
    ...overrides,
  });
}

function mockFetchResponse(
  body: unknown,
  status: number = 200,
  headers?: Record<string, string>,
): void {
  const headersObj = new Headers(headers);
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    text: () =>
      Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  } as Response);
}

describe("MAIPClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a receipt with correct headers and body", async () => {
    const expectedResponse = {
      receipt_id: "rcpt-001",
      tenant_id: "test-tenant",
      agent_id: "agent-001",
      action: "github.commit.abc12345",
      receipt_type: "action",
      payload: {},
      inputs_hash: "hash1",
      outputs_hash: "hash2",
      delegation_chain_hash: "chain-hash",
      attestation_id: "att-001",
      previous_receipt_id: null,
      status: "COMPLETE",
      duration_ms: 42,
      error_code: null,
      created_at: "2026-04-07T00:00:00Z",
      updated_at: "2026-04-07T00:00:00Z",
    };

    mockFetchResponse(expectedResponse);

    const client = createClient();
    const result = await client.createReceipt({
      action: "github.commit.abc12345",
      agent_id: "agent-001",
      payload: { commit_sha: "abc12345" },
      receipt_type: "action",
    });

    expect(result.receipt_id).toBe("rcpt-001");
    expect(result.delegation_chain_hash).toBe("chain-hash");

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toBe("https://api.test.com/v1/receipts");
    const requestInit = fetchCall[1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("test-api-key");
    expect(headers["X-Tenant-ID"]).toBe("test-tenant");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should verify a receipt by ID", async () => {
    const expectedResponse = {
      valid: true,
      verdict: "Receipt chain verified",
      details: "All hashes match",
      warnings: [],
    };

    mockFetchResponse(expectedResponse);

    const client = createClient();
    const result = await client.verifyReceipt("rcpt-001");

    expect(result.valid).toBe(true);
    expect(result.verdict).toBe("Receipt chain verified");

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toBe(
      "https://api.test.com/v1/receipts/rcpt-001/verify",
    );
  });

  it("should get trust score for an agent", async () => {
    const expectedResponse = {
      agent_id: "agent-001",
      trust_level: "delegated",
      trust_score: 0.92,
      score_components: {
        reputation: 0.95,
        key_health: 1.0,
        delegation_depth: 0.9,
        verification_history: 0.85,
        multi_witness: 0.8,
        anomaly_penalty: 0.0,
      },
      trust_ceiling: 0.95,
      delegation_depth: 1,
      computed_at: "2026-04-07T00:00:00Z",
      valid_until: "2026-04-07T01:00:00Z",
    };

    mockFetchResponse(expectedResponse);

    const client = createClient();
    const result = await client.getTrustScore("agent-001");

    expect(result.trust_score).toBe(0.92);
    expect(result.trust_level).toBe("delegated");
  });

  it("should throw MAIPApiError on non-retryable HTTP error", async () => {
    mockFetchResponse({ code: "NOT_FOUND", message: "Receipt not found" }, 404);

    const client = createClient();
    await expect(client.verifyReceipt("nonexistent")).rejects.toThrow(
      MAIPApiError,
    );
  });

  it("should throw MAIPApiError with parsed error details", async () => {
    mockFetchResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Invalid payload",
        details: { field: "agent_id" },
      },
      400,
    );

    const client = createClient();
    try {
      await client.createReceipt({
        action: "test",
        agent_id: "",
        payload: {},
        receipt_type: "action",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MAIPApiError);
      const apiError = error as MAIPApiError;
      expect(apiError.statusCode).toBe(400);
      expect(apiError.errorCode).toBe("VALIDATION_ERROR");
      expect(apiError.details).toEqual({ field: "agent_id" });
    }
  });

  it("should handle empty response body", async () => {
    mockFetchResponse("", 200);

    const client = createClient();
    const result = await client.getReceipt("rcpt-empty");

    expect(result).toBeUndefined();
  });

  it("should retry on 429 and 503 status codes", async () => {
    const rateLimitedResponse = {
      ok: false,
      status: 429,
      headers: new Headers(),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            code: "RATE_LIMITED",
            message: "Too many requests",
          }),
        ),
    } as Response;

    const successResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            receipt_id: "rcpt-retry",
            tenant_id: "test-tenant",
            agent_id: "agent-001",
            action: "test",
            receipt_type: "action",
            payload: {},
            inputs_hash: "h1",
            outputs_hash: "h2",
            delegation_chain_hash: "chain",
            attestation_id: "att",
            previous_receipt_id: null,
            status: "COMPLETE",
            duration_ms: null,
            error_code: null,
            created_at: "2026-04-07T00:00:00Z",
            updated_at: "2026-04-07T00:00:00Z",
          }),
        ),
    } as Response;

    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(rateLimitedResponse)
      .mockResolvedValueOnce(successResponse);

    const client = createClient({ maxRetries: 1 });
    const result = await client.getReceipt("rcpt-retry");

    expect(result.receipt_id).toBe("rcpt-retry");
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
