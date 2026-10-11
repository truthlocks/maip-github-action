/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Create GitHub Check Runs showing receipt chain integrity status.
 */
import * as github from "@actions/github";
import type { ReceiptResponse, VerifyReceiptResponse } from "../types.js";
/**
 * Create a GitHub Check Run that reports on the receipt chain integrity.
 * Shows whether the chain of receipts forms a valid, unbroken sequence.
 */
export declare function createChainCheck(octokit: ReturnType<typeof github.getOctokit>, receipt: ReceiptResponse, verification: VerifyReceiptResponse): Promise<void>;
//# sourceMappingURL=chain-check.d.ts.map