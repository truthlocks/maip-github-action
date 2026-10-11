/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Post and update PR comments with MAIP receipt summaries.
 * Implements idempotent comment updates via hidden HTML markers.
 */
import * as github from "@actions/github";
import type { ReceiptResponse, VerifyReceiptResponse, TrustScoreResponse } from "../types.js";
/**
 * Post or update a PR comment with the receipt summary.
 * If a MAIP comment already exists, updates it in place (idempotent).
 */
export declare function postPRComment(octokit: ReturnType<typeof github.getOctokit>, receipt: ReceiptResponse, verification: VerifyReceiptResponse | null, trustScore: TrustScoreResponse | null): Promise<void>;
/**
 * Post or update a PR comment with verification-only results.
 */
export declare function postVerificationComment(octokit: ReturnType<typeof github.getOctokit>, receiptId: string, verification: VerifyReceiptResponse): Promise<void>;
//# sourceMappingURL=pr-comment.d.ts.map