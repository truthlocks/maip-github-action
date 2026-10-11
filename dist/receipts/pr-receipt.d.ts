/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub pull request events.
 * Captures PR metadata, review status, and merge results.
 */
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { PRReceiptPayload, ReceiptResponse } from "../types.js";
/**
 * Build the PR receipt payload from the pull_request event context.
 */
export declare function buildPRPayload(octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<PRReceiptPayload>;
/**
 * Create a MAIP receipt for the current PR event.
 */
export declare function createPRReceipt(client: MAIPClient, octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<ReceiptResponse>;
//# sourceMappingURL=pr-receipt.d.ts.map