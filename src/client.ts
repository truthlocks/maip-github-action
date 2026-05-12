/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * MAIP API client with retry, exponential backoff, and proper auth headers.
 * Adapted from the shared MAIP client pattern for GitHub Action context.
 */

import * as core from "@actions/core";
import type {
  MAIPConfig,
  ApiError,
  CreateReceiptRequest,
  ReceiptResponse,
  VerifyReceiptResponse,
  TrustScoreResponse,
} from "./types.js";

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

export class MAIPApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(statusCode: number, apiError: ApiError) {
    super(apiError.message);
    this.name = "MAIPApiError";
    this.statusCode = statusCode;
    this.errorCode = apiError.code;
    this.details = apiError.details;
  }
}

export class MAIPNetworkError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "MAIPNetworkError";
    this.cause = cause;
  }
}

export class MAIPClient {
  private readonly config: MAIPConfig;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(config: MAIPConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /**
   * Submit a new receipt to the MAIP API.
   */
  async createReceipt(request: CreateReceiptRequest): Promise<ReceiptResponse> {
    core.debug(
      `Creating receipt: action=${request.action}, type=${request.receipt_type}`,
    );
    return this.request<ReceiptResponse>("POST", "/agent-receipts", request);
  }

  /**
   * Verify an existing receipt by its ID.
   * Since the backend has no dedicated verify endpoint, we fetch the receipt
   * and derive verification from its status and signature fields.
   */
  async verifyReceipt(receiptId: string): Promise<VerifyReceiptResponse> {
    core.debug(`Verifying receipt: ${receiptId}`);
    const receipt = await this.getReceipt(receiptId);
    const valid = receipt.status === "valid";
    return {
      valid,
      verdict: valid ? "PASS" : "FAIL",
      details: valid
        ? "Receipt signature and chain verified successfully"
        : `Receipt status is ${receipt.status}`,
      warnings:
        receipt.status === "expired"
          ? ["Receipt has expired"]
          : receipt.status === "superseded"
            ? ["Receipt has been superseded by a newer receipt"]
            : [],
    };
  }

  /**
   * Retrieve a receipt by ID.
   */
  async getReceipt(receiptId: string): Promise<ReceiptResponse> {
    core.debug(`Fetching receipt: ${receiptId}`);
    return this.request<ReceiptResponse>(
      "GET",
      `/agent-receipts/${encodeURIComponent(receiptId)}`,
    );
  }

  /**
   * Get trust score for an agent.
   */
  async getTrustScore(agentId: string): Promise<TrustScoreResponse> {
    core.debug(`Fetching trust score: agent=${agentId}`);
    return this.request<TrustScoreResponse>(
      "GET",
      `/agents/${encodeURIComponent(agentId)}/trust-score`,
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": this.config.apiKey,
    };
    if (this.config.tenantId && !this.config.apiKey.startsWith("tl_live_")) {
      headers["X-Tenant-ID"] = this.config.tenantId;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.calculateDelay(attempt);
        core.debug(
          `Retry attempt ${attempt}/${this.maxRetries}, waiting ${delay}ms`,
        );
        await this.sleep(delay);
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const text = await response.text();
          if (text.length === 0) {
            return undefined as T;
          }
          return JSON.parse(text) as T;
        }

        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < this.maxRetries
        ) {
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter) {
            const retryDelaySeconds = parseInt(retryAfter, 10);
            if (!isNaN(retryDelaySeconds)) {
              await this.sleep(retryDelaySeconds * 1000);
            }
          }
          lastError = new MAIPApiError(response.status, {
            code: `HTTP_${response.status}`,
            message: `Request failed with status ${response.status}`,
          });
          continue;
        }

        const errorBody = await response.text();
        let apiError: ApiError;
        try {
          apiError = JSON.parse(errorBody) as ApiError;
        } catch {
          apiError = {
            code: `HTTP_${response.status}`,
            message:
              errorBody || `Request failed with status ${response.status}`,
          };
        }

        throw new MAIPApiError(response.status, apiError);
      } catch (error: unknown) {
        if (error instanceof MAIPApiError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new MAIPNetworkError(
            `Request to ${method} ${path} timed out after ${this.timeoutMs}ms`,
            error,
          );
          if (attempt < this.maxRetries) {
            continue;
          }
        }

        if (attempt < this.maxRetries) {
          lastError = new MAIPNetworkError(
            `Network error on ${method} ${path}`,
            error,
          );
          continue;
        }

        throw new MAIPNetworkError(
          `Request to ${method} ${path} failed after ${this.maxRetries + 1} attempts`,
          error,
        );
      }
    }

    throw (
      lastError ??
      new MAIPNetworkError("Request failed with unknown error", undefined)
    );
  }

  private buildUrl(path: string): string {
    return `${this.config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    const jitter = Math.random() * BASE_DELAY_MS;
    return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
