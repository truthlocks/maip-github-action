/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub release events.
 * Captures tag, assets, changelog, and release metadata.
 */
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { ReleaseReceiptPayload, ReceiptResponse } from "../types.js";
/**
 * Build the release receipt payload from the release event context.
 */
export declare function buildReleasePayload(octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<ReleaseReceiptPayload>;
/**
 * Create a MAIP receipt for the current release event.
 */
export declare function createReleaseReceipt(client: MAIPClient, octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string): Promise<ReceiptResponse>;
//# sourceMappingURL=release-receipt.d.ts.map