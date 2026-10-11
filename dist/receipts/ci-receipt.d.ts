/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub CI workflow run events.
 * Captures workflow metadata, job details, step outcomes, and duration.
 */
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { CIReceiptPayload, ReceiptResponse } from "../types.js";
/**
 * Build the CI receipt payload from workflow run context and environment.
 */
export declare function buildCIPayload(octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<CIReceiptPayload>;
/**
 * Create a MAIP receipt for the current CI workflow run.
 */
export declare function createCIReceipt(client: MAIPClient, octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<ReceiptResponse>;
//# sourceMappingURL=ci-receipt.d.ts.map