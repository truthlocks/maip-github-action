/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub pull request events.
 * Captures PR metadata, review status, and merge results.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { PRReceiptPayload, ReceiptResponse } from "../types.js";
import {
  computePayloadHash,
  canonicalJson,
  hashContent,
  nowISO,
} from "./utils.js";

/**
 * Build the PR receipt payload from the pull_request event context.
 */
export async function buildPRPayload(
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
): Promise<PRReceiptPayload> {
  const { owner, repo } = github.context.repo;
  const prPayload = github.context.payload.pull_request;

  if (!prPayload) {
    throw new Error(
      "No pull_request payload found in GitHub context. Is this a pull_request event?",
    );
  }

  const prNumber = prPayload.number as number;

  let reviewers: string[] = [];
  let approvedBy: string[] = [];

  try {
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber,
    });

    const reviewerSet = new Set<string>();
    const approvedSet = new Set<string>();

    for (const review of reviews) {
      const login = review.user?.login;
      if (!login) continue;
      reviewerSet.add(login);
      if (review.state === "APPROVED") {
        approvedSet.add(login);
      }
    }

    reviewers = Array.from(reviewerSet).sort();
    approvedBy = Array.from(approvedSet).sort();
  } catch (error: unknown) {
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
    commitsCount = (prPayload.commits as number) ?? commits.length;
  } catch (error: unknown) {
    core.warning(`Failed to fetch PR commits count: ${String(error)}`);
    commitsCount = (prPayload.commits as number) ?? 0;
  }

  const body = (prPayload.body as string) ?? "";
  const bodyHash = hashContent(body);

  const payloadWithoutHash: Omit<PRReceiptPayload, "payload_hash"> = {
    receipt_type: "github_pr_receipt",
    agent_id: agentId,
    tenant_id: tenantId,
    repository: `${owner}/${repo}`,
    timestamp: nowISO(),
    pr_number: prNumber,
    title: (prPayload.title as string) ?? "",
    body_hash: bodyHash,
    author:
      ((prPayload.user as Record<string, unknown>)?.login as string) ??
      "unknown",
    base_branch:
      ((prPayload.base as Record<string, unknown>)?.ref as string) ?? "",
    head_branch:
      ((prPayload.head as Record<string, unknown>)?.ref as string) ?? "",
    head_sha:
      ((prPayload.head as Record<string, unknown>)?.sha as string) ??
      github.context.sha,
    commits_count: commitsCount,
    changed_files: (prPayload.changed_files as number) ?? 0,
    additions: (prPayload.additions as number) ?? 0,
    deletions: (prPayload.deletions as number) ?? 0,
    reviewers,
    approved_by: approvedBy,
    merge_commit_sha: (prPayload.merge_commit_sha as string) ?? null,
    status: (prPayload.state as string) ?? "open",
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
export async function createPRReceipt(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
): Promise<ReceiptResponse> {
  const payload = await buildPRPayload(octokit, agentId, tenantId);

  core.info(`Creating PR receipt for #${payload.pr_number}: ${payload.title}`);

  return client.createReceipt({
    action: `github.pr.${payload.pr_number}`,
    agent_id: agentId,
    payload: payload as unknown as Record<string, unknown>,
    receipt_type: "action",
  });
}
