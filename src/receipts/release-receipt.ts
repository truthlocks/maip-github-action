/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub release events.
 * Captures tag, assets, changelog, and release metadata.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type {
  ReleaseAsset,
  ReleaseReceiptPayload,
  ReceiptResponse,
} from "../types.js";
import {
  computePayloadHash,
  canonicalJson,
  hashContent,
  nowISO,
} from "./utils.js";

/**
 * Build the release receipt payload from the release event context.
 */
export async function buildReleasePayload(
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
): Promise<ReleaseReceiptPayload> {
  const { owner, repo } = github.context.repo;
  const releasePayload = github.context.payload.release;

  if (!releasePayload) {
    throw new Error(
      "No release payload found in GitHub context. Is this a release event?",
    );
  }

  let assets: ReleaseAsset[] = [];

  try {
    const releaseId = releasePayload.id as number;
    const { data: releaseAssets } = await octokit.rest.repos.listReleaseAssets({
      owner,
      repo,
      release_id: releaseId,
      per_page: 100,
    });

    assets = releaseAssets.map((asset) => ({
      name: asset.name,
      size: asset.size,
      content_type: asset.content_type,
      download_url: asset.browser_download_url,
    }));
  } catch (error: unknown) {
    core.warning(`Failed to fetch release assets: ${String(error)}`);
    const rawAssets = releasePayload.assets as
      | Array<Record<string, unknown>>
      | undefined;
    if (rawAssets) {
      assets = rawAssets.map((a) => ({
        name: (a.name as string) ?? "unknown",
        size: (a.size as number) ?? 0,
        content_type: (a.content_type as string) ?? "application/octet-stream",
        download_url: (a.browser_download_url as string) ?? "",
      }));
    }
  }

  const body = (releasePayload.body as string) ?? "";
  const bodyHash = hashContent(body);

  const payloadWithoutHash: Omit<ReleaseReceiptPayload, "payload_hash"> = {
    receipt_type: "github_release_receipt",
    agent_id: agentId,
    tenant_id: tenantId,
    repository: `${owner}/${repo}`,
    timestamp: nowISO(),
    tag_name: (releasePayload.tag_name as string) ?? "",
    release_name: (releasePayload.name as string) ?? "",
    target_commitish: (releasePayload.target_commitish as string) ?? "",
    draft: (releasePayload.draft as boolean) ?? false,
    prerelease: (releasePayload.prerelease as boolean) ?? false,
    author:
      ((releasePayload.author as Record<string, unknown>)?.login as string) ??
      "unknown",
    body_hash: bodyHash,
    assets,
  };

  const payloadHash = computePayloadHash(canonicalJson(payloadWithoutHash));

  return {
    ...payloadWithoutHash,
    payload_hash: payloadHash,
  };
}

/**
 * Create a MAIP receipt for the current release event.
 */
export async function createReleaseReceipt(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
): Promise<ReceiptResponse> {
  const payload = await buildReleasePayload(octokit, agentId, tenantId);

  core.info(
    `Creating release receipt for ${payload.tag_name}: ${payload.release_name}`,
  );

  return client.createReceipt({
    action: `github.release.${payload.tag_name}`,
    agent_id: agentId,
    payload: payload as unknown as Record<string, unknown>,
    receipt_type: "action",
  });
}
