/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Create GitHub Check Runs showing receipt chain integrity status.
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
const CHECK_NAME = "MAIP Receipt Chain Integrity";
/**
 * Create a GitHub Check Run that reports on the receipt chain integrity.
 * Shows whether the chain of receipts forms a valid, unbroken sequence.
 */
export async function createChainCheck(octokit, receipt, verification) {
    const { owner, repo } = github.context.repo;
    const sha = github.context.sha;
    const conclusion = "neutral";
    const title = "Receipt chain not independently verified";
    const summary = "Individual signature verification does not establish full chain or transparency-log validity.";
    const text = `Receipt: ${receipt.receipt_id}\nIndividual verdict: ${verification.verdict}\nPrevious receipt: ${receipt.previous_receipt_id || "none"}\nNo full-chain or transparency proof was checked by this action.`;
    try {
        await octokit.rest.checks.create({
            owner,
            repo,
            head_sha: sha,
            name: CHECK_NAME,
            status: "completed",
            conclusion,
            output: {
                title,
                summary,
                text,
            },
        });
        core.info(`Created check run '${CHECK_NAME}' with conclusion: ${conclusion}`);
    }
    catch (error) {
        core.warning(`Failed to create chain check run: ${String(error)}`);
    }
}
//# sourceMappingURL=chain-check.js.map