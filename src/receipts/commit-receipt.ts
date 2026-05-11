/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub commit events.
 * Captures commit SHA, author, diff stats, and file-change breakdown.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import type { MAIPClient } from "../client.js";
import type { CommitReceiptPayload, ReceiptResponse } from "../types.js";
import { computePayloadHash, canonicalJson, nowISO } from "./utils.js";

/**
 * Build the commit receipt payload from the GitHub push event context.
 * Fetches extended commit data from the GitHub API when available.
 */
export async function buildCommitPayload(
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
): Promise<CommitReceiptPayload> {
  const { owner, repo } = github.context.repo;
  const sha = github.context.sha;
  const ref = github.context.ref;
  const branch = ref.replace(/^refs\/heads\//, "");

  let author = "";
  let committer = "";
  let message = "";
  let treeSha = "";
  let parentShas: string[] = [];
  let filesAdded = 0;
  let filesModified = 0;
  let filesRemoved = 0;
  let additions = 0;
  let deletions = 0;

  try {
    const { data: commitData } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    author =
      commitData.commit.author?.name ?? commitData.author?.login ?? "unknown";
    committer =
      commitData.commit.committer?.name ??
      commitData.committer?.login ??
      "unknown";
    message = commitData.commit.message;
    treeSha = commitData.commit.tree.sha;
    parentShas = commitData.parents.map((p) => p.sha);
    additions = commitData.stats?.additions ?? 0;
    deletions = commitData.stats?.deletions ?? 0;

    for (const file of commitData.files ?? []) {
      switch (file.status) {
        case "added":
          filesAdded++;
          break;
        case "modified":
        case "changed":
          filesModified++;
          break;
        case "removed":
          filesRemoved++;
          break;
        default:
          filesModified++;
          break;
      }
    }
  } catch (error: unknown) {
    core.warning(
      `Failed to fetch commit details from GitHub API: ${String(error)}`,
    );
    const pushPayload = github.context.payload;
    const headCommit = pushPayload.head_commit as
      | Record<string, unknown>
      | undefined;
    if (headCommit) {
      author =
        (headCommit.author as Record<string, string> | undefined)?.name ??
        "unknown";
      committer =
        (headCommit.committer as Record<string, string> | undefined)?.name ??
        "unknown";
      message = (headCommit.message as string) ?? "";
      treeSha = (headCommit.tree_id as string) ?? "";
    }
  }

  const payloadWithoutHash: Omit<CommitReceiptPayload, "payload_hash"> = {
    receipt_type: "github_commit_receipt",
    agent_id: agentId,
    tenant_id: tenantId,
    repository: `${owner}/${repo}`,
    timestamp: nowISO(),
    commit_sha: sha,
    author,
    committer,
    message,
    tree_sha: treeSha,
    parent_shas: parentShas,
    files_added: filesAdded,
    files_modified: filesModified,
    files_removed: filesRemoved,
    additions,
    deletions,
    branch,
  };

  const payloadHash = computePayloadHash(canonicalJson(payloadWithoutHash));

  return {
    ...payloadWithoutHash,
    payload_hash: payloadHash,
  };
}

/**
 * Create a MAIP receipt for the current commit event.
 */
export async function createCommitReceipt(
  client: MAIPClient,
  octokit: ReturnType<typeof github.getOctokit>,
  agentId: string,
  tenantId: string,
): Promise<ReceiptResponse> {
  const payload = await buildCommitPayload(octokit, agentId, tenantId);

  core.info(
    `Creating commit receipt for ${payload.commit_sha.substring(0, 8)} on ${payload.branch}`,
  );

  return client.createReceipt({
    action: `github.commit.${payload.commit_sha.substring(0, 8)}`,
    agent_id: agentId,
    payload: payload as unknown as Record<string, unknown>,
    receipt_type: "action",
  });
}
