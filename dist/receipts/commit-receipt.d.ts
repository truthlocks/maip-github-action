/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub commit events.
 * Captures commit SHA, author, diff stats, and file-change breakdown.
 */
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { CommitReceiptPayload, ReceiptResponse } from "../types.js";
/**
 * Build the commit receipt payload from the GitHub push event context.
 * Fetches extended commit data from the GitHub API when available.
 */
export declare function buildCommitPayload(octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<CommitReceiptPayload>;
/**
 * Create a MAIP receipt for the current commit event.
 */
export declare function createCommitReceipt(client: MAIPClient, octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<ReceiptResponse>;
//# sourceMappingURL=commit-receipt.d.ts.map