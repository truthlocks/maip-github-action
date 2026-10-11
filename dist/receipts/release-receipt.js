/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub release events.
 * Captures tag, assets, changelog, and release metadata.
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
import { computePayloadHash, canonicalJson, hashContent, nowISO, } from "./utils.js";
/**
 * Build the release receipt payload from the release event context.
 */
export async function buildReleasePayload(octokit, agentId, tenantId) {
    const { owner, repo } = github.context.repo;
    const releasePayload = github.context.payload.release;
    if (!releasePayload) {
        throw new Error("No release payload found in GitHub context. Is this a release event?");
    }
    let assets = [];
    try {
        const releaseId = releasePayload.id;
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
    }
    catch (error) {
        core.warning(`Failed to fetch release assets: ${String(error)}`);
        const rawAssets = releasePayload.assets;
        if (rawAssets) {
            assets = rawAssets.map((a) => ({
                name: a.name ?? "unknown",
                size: a.size ?? 0,
                content_type: a.content_type ?? "application/octet-stream",
                download_url: a.browser_download_url ?? "",
            }));
        }
    }
    const body = releasePayload.body ?? "";
    const bodyHash = hashContent(body);
    const payloadWithoutHash = {
        receipt_type: "github_release_receipt",
        agent_id: agentId,
        tenant_id: tenantId,
        repository: `${owner}/${repo}`,
        timestamp: nowISO(),
        tag_name: releasePayload.tag_name ?? "",
        release_name: releasePayload.name ?? "",
        target_commitish: releasePayload.target_commitish ?? "",
        draft: releasePayload.draft ?? false,
        prerelease: releasePayload.prerelease ?? false,
        author: releasePayload.author?.login ??
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
export async function createReleaseReceipt(client, octokit, agentId, tenantId) {
    const payload = await buildReleasePayload(octokit, agentId, tenantId);
    core.info(`Creating release receipt for ${payload.tag_name}: ${payload.release_name}`);
    return client.createReceipt({
        action: `github.release.${payload.tag_name}`,
        agent_id: agentId,
        payload: payload,
        receipt_type: "action",
    });
}
//# sourceMappingURL=release-receipt.js.map