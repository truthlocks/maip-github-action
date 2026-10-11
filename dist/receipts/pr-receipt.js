/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub pull request events.
 * Captures PR metadata, review status, and merge results.
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
import { computePayloadHash, canonicalJson, hashContent, nowISO, } from "./utils.js";
/**
 * Build the PR receipt payload from the pull_request event context.
 */
export async function buildPRPayload(octokit, agentId, tenantId) {
    const { owner, repo } = github.context.repo;
    const prPayload = github.context.payload.pull_request;
    if (!prPayload) {
        throw new Error("No pull_request payload found in GitHub context. Is this a pull_request event?");
    }
    const prNumber = prPayload.number;
    let reviewers = [];
    let approvedBy = [];
    try {
        const { data: reviews } = await octokit.rest.pulls.listReviews({
            owner,
            repo,
            pull_number: prNumber,
        });
        const reviewerSet = new Set();
        const approvedSet = new Set();
        for (const review of reviews) {
            const login = review.user?.login;
            if (!login)
                continue;
            reviewerSet.add(login);
            if (review.state === "APPROVED") {
                approvedSet.add(login);
            }
        }
        reviewers = Array.from(reviewerSet).sort();
        approvedBy = Array.from(approvedSet).sort();
    }
    catch (error) {
        core.warning(`Failed to fetch PR reviews: ${String(error)}`);
    }
    let commitsCount = 0;
    try {
        const { data: commits } = await octokit.rest.pulls.listCommits({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 1,
        });
        commitsCount = prPayload.commits ?? commits.length;
    }
    catch (error) {
        core.warning(`Failed to fetch PR commits count: ${String(error)}`);
        commitsCount = prPayload.commits ?? 0;
    }
    const body = prPayload.body ?? "";
    const bodyHash = hashContent(body);
    const payloadWithoutHash = {
        receipt_type: "github_pr_receipt",
        agent_id: agentId,
        tenant_id: tenantId,
        repository: `${owner}/${repo}`,
        timestamp: nowISO(),
        pr_number: prNumber,
        title: prPayload.title ?? "",
        body_hash: bodyHash,
        author: prPayload.user?.login ??
            "unknown",
        base_branch: prPayload.base?.ref ?? "",
        head_branch: prPayload.head?.ref ?? "",
        head_sha: prPayload.head?.sha ??
            github.context.sha,
        commits_count: commitsCount,
        changed_files: prPayload.changed_files ?? 0,
        additions: prPayload.additions ?? 0,
        deletions: prPayload.deletions ?? 0,
        reviewers,
        approved_by: approvedBy,
        merge_commit_sha: prPayload.merge_commit_sha ?? null,
        status: prPayload.state ?? "open",
    };
    const payloadHash = computePayloadHash(canonicalJson(payloadWithoutHash));
    return {
        ...payloadWithoutHash,
        payload_hash: payloadHash,
    };
}
/**
 * Create a MAIP receipt for the current PR event.
 */
export async function createPRReceipt(client, octokit, agentId, tenantId) {
    const payload = await buildPRPayload(octokit, agentId, tenantId);
    core.info(`Creating PR receipt for #${payload.pr_number}: ${payload.title}`);
    return client.createReceipt({
        action: `github.pr.${payload.pr_number}`,
        agent_id: agentId,
        payload: payload,
        receipt_type: "action",
    });
}
//# sourceMappingURL=pr-receipt.js.map