/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Main entry point for the MAIP GitHub Action.
 * Routes operation modes and event types to the appropriate handlers.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import { MAIPClient } from "./client.js";
import { loadActionConfig, resolveAgentId, detectEventType } from "./config.js";
import { createCommitReceipt } from "./receipts/commit-receipt.js";
import { createPRReceipt } from "./receipts/pr-receipt.js";
import { createReleaseReceipt } from "./receipts/release-receipt.js";
import { createCIReceipt } from "./receipts/ci-receipt.js";
import { createArtifactReceipts } from "./receipts/artifact-receipt.js";
import { createReceiptCheck } from "./checks/receipt-check.js";
import { createTrustCheck } from "./checks/trust-check.js";
import { createChainCheck } from "./checks/chain-check.js";
import {
  postPRComment,
  postVerificationComment,
} from "./comments/pr-comment.js";
import {
  generateVerificationBadge,
  generateTrustBadge,
} from "./badges/badge-generator.js";
import type {
  EventType,
  ReceiptResponse,
  VerifyReceiptResponse,
  TrustScoreResponse,
} from "./types.js";

async function run(): Promise<void> {
  try {
    const config = loadActionConfig();
    const agentId = resolveAgentId(config);
    const eventType: EventType =
      config.eventType === "auto" ? detectEventType() : config.eventType;

    core.info(
      `MAIP GitHub Action - mode: ${config.mode}, event: ${eventType}, agent: ${agentId}`,
    );

    const maipClient = new MAIPClient({
      apiUrl: config.maipApiUrl,
      apiKey: config.maipApiKey,
      tenantId: config.tenantId,
      timeoutMs: 30_000,
      maxRetries: 3,
    });

    const octokit = github.getOctokit(config.githubToken);

    switch (config.mode) {
      case "receipt":
        await handleReceiptMode(
          maipClient,
          octokit,
          config.tenantId,
          agentId,
          eventType,
          config,
        );
        break;

      case "verify":
        await handleVerifyMode(maipClient, octokit, config.receiptId, config);
        break;

      case "check":
        await handleCheckMode(maipClient, octokit, agentId);
        break;

      case "comment":
        await handleCommentMode(
          maipClient,
          octokit,
          config.tenantId,
          agentId,
          eventType,
          config,
        );
        break;

      case "badge":
        await handleBadgeMode(maipClient, agentId);
        break;
    }
  } catch (error: unknown) {
    /**
     * Never fail the CI build due to MAIP errors.
     * Log the error as a warning so the workflow continues.
     */
    const message = error instanceof Error ? error.message : String(error);
    core.warning(`MAIP GitHub Action failed: ${message}`);
    core.setOutput("verification-status", "error");
  }
}

/**
 * Mode: receipt
 * Generate a new receipt for the detected event type.
 * Optionally create check runs and post PR comments.
 */
async function handleReceiptMode(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  tenantId: string,
  agentId: string,
  eventType: EventType,
  config: ReturnType<typeof loadActionConfig>,
): Promise<void> {
  let receipt: ReceiptResponse;

  switch (eventType) {
    case "commit":
      receipt = await createCommitReceipt(client, octokit, agentId, tenantId);
      break;

    case "pr":
      receipt = await createPRReceipt(client, octokit, agentId, tenantId);
      break;

    case "release":
      receipt = await createReleaseReceipt(client, octokit, agentId, tenantId);
      break;

    case "ci":
      receipt = await createCIReceipt(client, octokit, agentId, tenantId);
      break;

    case "artifact": {
      const receipts = await createArtifactReceipts(
        client,
        octokit,
        agentId,
        tenantId,
      );
      if (receipts.length === 0) {
        core.warning("No artifacts found; no receipts generated");
        return;
      }
      receipt = receipts[0];
      for (let i = 1; i < receipts.length; i++) {
        core.info(`Additional artifact receipt: ${receipts[i].receipt_id}`);
      }
      break;
    }

    default:
      core.warning(`Unsupported event type: ${eventType}`);
      return;
  }

  core.setOutput("receipt-id", receipt.receipt_id);
  core.setOutput("receipt-hash", receipt.delegation_chain_hash);

  let verification: VerifyReceiptResponse | null = null;
  let trustScore: TrustScoreResponse | null = null;

  try {
    verification = await client.verifyReceipt(receipt.receipt_id);
    core.setOutput(
      "verification-status",
      verification.valid ? "valid" : "invalid",
    );
  } catch (error: unknown) {
    core.warning(`Receipt verification failed: ${String(error)}`);
    core.setOutput("verification-status", "pending");
  }

  try {
    trustScore = await client.getTrustScore(agentId);
    core.setOutput("trust-score", String(trustScore.trust_score));
  } catch (error: unknown) {
    core.warning(`Trust score fetch failed: ${String(error)}`);
  }

  if (config.createCheck && verification) {
    await createReceiptCheck(octokit, receipt, verification);
    await createChainCheck(octokit, receipt, verification);

    if (trustScore) {
      await createTrustCheck(octokit, trustScore);
    }
  }

  if (config.postComment) {
    await postPRComment(octokit, receipt, verification, trustScore);
  }

  core.info(
    `Receipt created: ${receipt.receipt_id} (chain: ${receipt.delegation_chain_hash.substring(0, 16)}...)`,
  );
}

/**
 * Mode: verify
 * Verify an existing receipt by ID.
 * Optionally create check runs and post PR comments.
 */
async function handleVerifyMode(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  receiptId: string,
  config: ReturnType<typeof loadActionConfig>,
): Promise<void> {
  const receipt = await client.getReceipt(receiptId);
  const verification = await client.verifyReceipt(receiptId);

  core.setOutput("receipt-id", receipt.receipt_id);
  core.setOutput("receipt-hash", receipt.delegation_chain_hash);
  core.setOutput(
    "verification-status",
    verification.valid ? "valid" : "invalid",
  );

  if (config.createCheck) {
    await createReceiptCheck(octokit, receipt, verification);
    await createChainCheck(octokit, receipt, verification);
  }

  if (config.postComment) {
    await postVerificationComment(octokit, receiptId, verification);
  }

  core.info(
    `Verification result for ${receiptId}: ${verification.valid ? "VALID" : "INVALID"} - ${verification.verdict}`,
  );
}

/**
 * Mode: check
 * Create GitHub Check Runs for the agent's trust score.
 */
async function handleCheckMode(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
): Promise<void> {
  const trustScore = await client.getTrustScore(agentId);
  core.setOutput("trust-score", String(trustScore.trust_score));

  await createTrustCheck(octokit, trustScore);

  core.info(
    `Trust check created for ${agentId}: ${(trustScore.trust_score * 100).toFixed(1)}%`,
  );
}

/**
 * Mode: comment
 * Post a PR comment with receipt summary (same as receipt mode but without creating receipts).
 * Requires a receipt-id input.
 */
async function handleCommentMode(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  tenantId: string,
  agentId: string,
  eventType: EventType,
  config: ReturnType<typeof loadActionConfig>,
): Promise<void> {
  if (config.receiptId) {
    const receipt = await client.getReceipt(config.receiptId);
    let verification: VerifyReceiptResponse | null = null;
    let trustScore: TrustScoreResponse | null = null;

    try {
      verification = await client.verifyReceipt(config.receiptId);
    } catch (error: unknown) {
      core.warning(`Verification failed: ${String(error)}`);
    }

    try {
      trustScore = await client.getTrustScore(receipt.agent_id);
    } catch (error: unknown) {
      core.warning(`Trust score fetch failed: ${String(error)}`);
    }

    await postPRComment(octokit, receipt, verification, trustScore);
  } else {
    await handleReceiptMode(
      client,
      octokit,
      tenantId,
      agentId,
      eventType,
      config,
    );
  }
}

/**
 * Mode: badge
 * Generate SVG badges and set them as outputs.
 */
async function handleBadgeMode(
  client: MAIPClient,
  agentId: string,
): Promise<void> {
  const trustScore = await client.getTrustScore(agentId);

  const verificationBadge = generateVerificationBadge(true);
  const trustBadge = generateTrustBadge(trustScore.trust_score);

  core.setOutput("trust-score", String(trustScore.trust_score));
  core.setOutput(
    "badge-url",
    `data:image/svg+xml;base64,${Buffer.from(verificationBadge).toString("base64")}`,
  );

  core.info(
    `Trust badge generated: ${(trustScore.trust_score * 100).toFixed(1)}%`,
  );
  core.debug(`Verification badge SVG length: ${verificationBadge.length}`);
  core.debug(`Trust badge SVG length: ${trustBadge.length}`);
}

run();
