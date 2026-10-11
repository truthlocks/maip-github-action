/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Markdown templates for PR comments showing receipt information.
 */
import type { ReceiptResponse, VerifyReceiptResponse, TrustScoreResponse } from "../types.js";
/**
 * Hidden HTML marker used to identify and update existing MAIP comments
 * on a PR, preventing duplicate comments on re-runs.
 */
export declare const COMMENT_MARKER = "<!-- maip-receipt-comment -->";
/**
 * Generate the full PR comment body for a receipt with verification.
 */
export declare function renderReceiptComment(receipt: ReceiptResponse, verification: VerifyReceiptResponse | null, trustScore: TrustScoreResponse | null): string;
/**
 * Generate a minimal comment body for verification-only mode.
 */
export declare function renderVerificationComment(receiptId: string, verification: VerifyReceiptResponse): string;
//# sourceMappingURL=templates.d.ts.map