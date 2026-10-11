/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * MAIP API client with retry, exponential backoff, and proper auth headers.
 * Adapted from the shared MAIP client pattern for GitHub Action context.
 */
import * as core from "@actions/core";
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;
export class MAIPApiError extends Error {
    statusCode;
    errorCode;
    details;
    constructor(statusCode, apiError) {
        super(apiError.message);
        this.name = "MAIPApiError";
        this.statusCode = statusCode;
        this.errorCode = apiError.code;
        this.details = apiError.details;
    }
}
export class MAIPNetworkError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.name = "MAIPNetworkError";
        this.cause = cause;
    }
}
export class MAIPClient {
    config;
    maxRetries;
    timeoutMs;
    constructor(config) {
        this.config = config;
        this.maxRetries = config.maxRetries ?? 3;
        this.timeoutMs = config.timeoutMs ?? 30_000;
    }
    /**
     * Submit a new receipt to the MAIP API.
     */
    async createReceipt(request) {
        core.debug(`Creating receipt: action=${request.action}, type=${request.receipt_type}`);
        return this.request("POST", "/agent-receipts", { ...request, receipt_type: request.receipt_type ?? "action", metadata: request.payload });
    }
    /**
     * Verify an existing receipt by its ID.
     * Uses server signature verification and lifecycle checks; status alone is insufficient.
     */
    async verifyReceipt(receiptId) {
        const result = await this.request("GET", `/agent-receipts/verify/${encodeURIComponent(receiptId)}`);
        const valid = result.valid === true && result.verdict === "VALID" && result.signature_verified === true;
        return {
            valid,
            verdict: valid ? "PASS" : "FAIL",
            details: result.reason || result.verdict,
            warnings: result.transparency_verified ? [] : ["Transparency-log inclusion was not verified"],
        };
    }
    /**
     * Retrieve a receipt by ID.
     */
    async getReceipt(receiptId) {
        core.debug(`Fetching receipt: ${receiptId}`);
        return this.request("GET", `/agent-receipts/${encodeURIComponent(receiptId)}`);
    }
    /**
     * Get trust score for an agent.
     */
    async getTrustScore(agentId) {
        core.debug(`Fetching trust score: agent=${agentId}`);
        return this.request("GET", `/agents/${encodeURIComponent(agentId)}/trust-score`);
    }
    async request(method, path, body) {
        const url = this.buildUrl(path);
        const headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": this.config.apiKey,
        };
        if (this.config.bearerToken) {
            if (this.config.apiKey)
                throw new Error("Use one API key or bearer token, not both");
            delete headers["X-API-Key"];
            headers["Authorization"] = `Bearer ${this.config.bearerToken}`;
        }
        const retries = method === "GET" || method === "HEAD" ? this.maxRetries : 0;
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) {
                const delay = this.calculateDelay(attempt);
                core.debug(`Retry attempt ${attempt}/${this.maxRetries}, waiting ${delay}ms`);
                await this.sleep(delay);
            }
            try {
                const response = await fetch(url, {
                    method,
                    headers,
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    signal: AbortSignal.timeout(this.timeoutMs),
                    redirect: "error",
                });
                if (response.ok) {
                    const text = await response.text();
                    if (text.length === 0) {
                        return undefined;
                    }
                    return JSON.parse(text);
                }
                if (RETRYABLE_STATUS_CODES.has(response.status) &&
                    attempt < retries) {
                    const retryAfter = response.headers.get("Retry-After");
                    if (retryAfter) {
                        const retryDelaySeconds = parseInt(retryAfter, 10);
                        if (!isNaN(retryDelaySeconds)) {
                            await this.sleep(Math.min(Math.max(retryDelaySeconds, 0) * 1000, MAX_DELAY_MS));
                        }
                    }
                    lastError = new MAIPApiError(response.status, {
                        code: `HTTP_${response.status}`,
                        message: `Request failed with status ${response.status}`,
                    });
                    continue;
                }
                const errorBody = await response.text();
                let apiError;
                try {
                    apiError = JSON.parse(errorBody);
                }
                catch {
                    apiError = {
                        code: `HTTP_${response.status}`,
                        message: errorBody || `Request failed with status ${response.status}`,
                    };
                }
                throw new MAIPApiError(response.status, apiError);
            }
            catch (error) {
                if (error instanceof MAIPApiError) {
                    throw error;
                }
                if (error instanceof DOMException && error.name === "AbortError") {
                    lastError = new MAIPNetworkError(`Request to ${method} ${path} timed out after ${this.timeoutMs}ms`, error);
                    if (attempt < retries) {
                        continue;
                    }
                }
                if (attempt < retries) {
                    lastError = new MAIPNetworkError(`Network error on ${method} ${path}`, error);
                    continue;
                }
                throw new MAIPNetworkError(`Request to ${method} ${path} failed after ${this.maxRetries + 1} attempts`, error);
            }
        }
        throw (lastError ??
            new MAIPNetworkError("Request failed with unknown error", undefined));
    }
    buildUrl(path) {
        return `${this.config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    }
    calculateDelay(attempt) {
        const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * BASE_DELAY_MS;
        return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=client.js.map