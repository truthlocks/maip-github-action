/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * MAIP API client with retry, exponential backoff, and proper auth headers.
 * Adapted from the shared MAIP client pattern for GitHub Action context.
 */
import type { MAIPConfig, ApiError, CreateReceiptRequest, ReceiptResponse, VerifyReceiptResponse, TrustScoreResponse } from "./types.js";
export declare class MAIPApiError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly details: Record<string, unknown> | undefined;
    constructor(statusCode: number, apiError: ApiError);
}
export declare class MAIPNetworkError extends Error {
    readonly cause: unknown;
    constructor(message: string, cause: unknown);
}
export declare class MAIPClient {
    private readonly config;
    private readonly maxRetries;
    private readonly timeoutMs;
    constructor(config: MAIPConfig);
    /**
     * Submit a new receipt to the MAIP API.
     */
    createReceipt(request: CreateReceiptRequest): Promise<ReceiptResponse>;
    /**
     * Verify an existing receipt by its ID.
     * Uses server signature verification and lifecycle checks; status alone is insufficient.
     */
    verifyReceipt(receiptId: string): Promise<VerifyReceiptResponse>;
    /**
     * Retrieve a receipt by ID.
     */
    getReceipt(receiptId: string): Promise<ReceiptResponse>;
    /**
     * Get trust score for an agent.
     */
    getTrustScore(agentId: string): Promise<TrustScoreResponse>;
    private request;
    private buildUrl;
    private calculateDelay;
    private sleep;
}
//# sourceMappingURL=client.d.ts.map