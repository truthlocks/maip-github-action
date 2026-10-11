/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub build artifacts.
 * Captures artifact name, hash, size, and originating workflow.
 */
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { ArtifactReceiptPayload, ReceiptResponse } from "../types.js";
/**
 * Build the artifact receipt payload. Fetches artifact details from the
 * GitHub API for the current workflow run.
 */
export declare function buildArtifactPayload(octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string, artifactName?: string): Promise<ArtifactReceiptPayload[]>;
/**
 * Create MAIP receipts for build artifacts in the current workflow run.
 * Returns one receipt per artifact.
 */
export declare function createArtifactReceipts(client: MAIPClient, octokit: ReturnType<typeof github.getOctokit>, agentId: string, tenantId: string, artifactName?: string): Promise<ReceiptResponse[]>;
//# sourceMappingURL=artifact-receipt.d.ts.map