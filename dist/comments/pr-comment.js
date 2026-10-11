/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Post and update PR comments with MAIP receipt summaries.
 * Implements idempotent comment updates via hidden HTML markers.
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
import { COMMENT_MARKER, renderReceiptComment, renderVerificationComment, } from "./templates.js";
/**
 * Find an existing MAIP comment on the given PR issue.
 * Returns the comment ID if found, null otherwise.
 */
async function findExistingComment(octokit, owner, repo, issueNumber) {
    let page = 1;
    const perPage = 50;
    while (true) {
        const { data: comments } = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: issueNumber,
            per_page: perPage,
            page,
        });
        for (const comment of comments) {
            if (comment.body?.includes(COMMENT_MARKER)) {
                return comment.id;
            }
        }
        if (comments.length < perPage) {
            break;
        }
        page++;
    }
    return null;
}
/**
 * Post or update a PR comment with the receipt summary.
 * If a MAIP comment already exists, updates it in place (idempotent).
 */
export async function postPRComment(octokit, receipt, verification, trustScore) {
    const prNumber = getPRNumber();
    if (!prNumber) {
        core.info("Not a PR context, skipping comment");
        return;
    }
    const { owner, repo } = github.context.repo;
    const body = renderReceiptComment(receipt, verification, trustScore);
    try {
        const existingCommentId = await findExistingComment(octokit, owner, repo, prNumber);
        if (existingCommentId) {
            await octokit.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existingCommentId,
                body,
            });
            core.info(`Updated existing MAIP comment (id: ${existingCommentId}) on PR #${prNumber}`);
        }
        else {
            const { data: created } = await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body,
            });
            core.info(`Created new MAIP comment (id: ${created.id}) on PR #${prNumber}`);
        }
    }
    catch (error) {
        core.warning(`Failed to post PR comment: ${String(error)}`);
    }
}
/**
 * Post or update a PR comment with verification-only results.
 */
export async function postVerificationComment(octokit, receiptId, verification) {
    const prNumber = getPRNumber();
    if (!prNumber) {
        core.info("Not a PR context, skipping verification comment");
        return;
    }
    const { owner, repo } = github.context.repo;
    const body = renderVerificationComment(receiptId, verification);
    try {
        const existingCommentId = await findExistingComment(octokit, owner, repo, prNumber);
        if (existingCommentId) {
            await octokit.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existingCommentId,
                body,
            });
            core.info(`Updated verification comment (id: ${existingCommentId}) on PR #${prNumber}`);
        }
        else {
            const { data: created } = await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body,
            });
            core.info(`Created verification comment (id: ${created.id}) on PR #${prNumber}`);
        }
    }
    catch (error) {
        core.warning(`Failed to post verification comment: ${String(error)}`);
    }
}
/**
 * Extract the PR number from the GitHub context.
 * Works for pull_request, pull_request_target, and issue_comment events.
 */
function getPRNumber() {
    const pr = github.context.payload.pull_request;
    if (pr) {
        return pr.number;
    }
    const issue = github.context.payload.issue;
    if (issue && github.context.payload.pull_request !== undefined) {
        return issue.number;
    }
    return null;
}
//# sourceMappingURL=pr-comment.js.map