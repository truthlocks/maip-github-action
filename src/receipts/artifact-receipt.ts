/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub build artifacts.
 * Captures artifact name, hash, size, and originating workflow.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { ArtifactReceiptPayload, ReceiptResponse } from "../types.js";
import { computePayloadHash, canonicalJson, nowISO } from "./utils.js";

/**
 * Build the artifact receipt payload. Fetches artifact details from the
 * GitHub API for the current workflow run.
 */
export async function buildArtifactPayload(
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
  artifactName?: string,
): Promise<ArtifactReceiptPayload[]> {
  const { owner, repo } = github.context.repo;
  const runId = parseInt(process.env["GITHUB_RUN_ID"] ?? "0", 10);
  const workflowName = process.env["GITHUB_WORKFLOW"] ?? "unknown";
  const payloads: ArtifactReceiptPayload[] = [];

  try {
    const { data: artifactsData } =
      await octokit.rest.actions.listWorkflowRunArtifacts({
        owner,
        repo,
        run_id: runId,
        per_page: 100,
      });

    const filteredArtifacts = artifactName
      ? artifactsData.artifacts.filter((a) => a.name === artifactName)
      : artifactsData.artifacts;

    if (filteredArtifacts.length === 0) {
      core.warning(
        artifactName
          ? `No artifact named '${artifactName}' found in run ${runId}`
          : `No artifacts found in run ${runId}`,
      );
    }

    for (const artifact of filteredArtifacts) {
      const downloadUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}/artifacts/${artifact.id}`;

      const payloadWithoutHash: Omit<ArtifactReceiptPayload, "payload_hash"> = {
        receipt_type: "github_artifact_receipt",
        agent_id: agentId,
        tenant_id: tenantId,
        repository: `${owner}/${repo}`,
        timestamp: nowISO(),
        artifact_name: artifact.name,
        artifact_hash: computePayloadHash(
          `${artifact.name}:${artifact.id}:${artifact.size_in_bytes}`,
        ),
        artifact_size: artifact.size_in_bytes,
        download_url: downloadUrl,
        run_id: runId,
        workflow_name: workflowName,
        head_sha: github.context.sha,
      };

      const payloadHash = computePayloadHash(canonicalJson(payloadWithoutHash));

      payloads.push({
        ...payloadWithoutHash,
        payload_hash: payloadHash,
      });
    }
  } catch (error: unknown) {
    core.warning(
      `Failed to fetch artifacts for run ${runId}: ${String(error)}`,
    );
  }

  return payloads;
}

/**
 * Create MAIP receipts for build artifacts in the current workflow run.
 * Returns one receipt per artifact.
 */
export async function createArtifactReceipts(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
  artifactName?: string,
): Promise<ReceiptResponse[]> {
  const payloads = await buildArtifactPayload(
    octokit,
    agentId,
    tenantId,
    artifactName,
  );
  const receipts: ReceiptResponse[] = [];

  for (const payload of payloads) {
    core.info(
      `Creating artifact receipt for '${payload.artifact_name}' (${payload.artifact_size} bytes)`,
    );

    const receipt = await client.createReceipt({
      action: `github.artifact.${payload.artifact_name}`,
      agent_id: agentId,
      payload: payload as unknown as Record<string, unknown>,
      receipt_type: "action",
    });

    receipts.push(receipt);
  }

  return receipts;
}
