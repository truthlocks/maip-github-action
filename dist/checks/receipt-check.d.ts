/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Create GitHub Check Runs showing MAIP receipt verification results.
 */
import * as github from "@actions/github";
import type { ReceiptResponse, VerifyReceiptResponse } from "../types.js";
/**
 * Create a GitHub Check Run that reports receipt verification status.
 * The check result is visible on the commit and in any open PR.
 */
export declare function createReceiptCheck(octokit: ReturnType<typeof github.getOctokit>, receipt: ReceiptResponse, verification: VerifyReceiptResponse): Promise<void>;
//# sourceMappingURL=receipt-check.d.ts.map