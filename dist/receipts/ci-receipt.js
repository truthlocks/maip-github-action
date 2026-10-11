/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate MAIP receipts for GitHub CI workflow run events.
 * Captures workflow metadata, job details, step outcomes, and duration.
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
import { computePayloadHash, canonicalJson, nowISO } from "./utils.js";
/**
 * Build the CI receipt payload from workflow run context and environment.
 */
export async function buildCIPayload(octokit, agentId, tenantId) {
    const { owner, repo } = github.context.repo;
    const runId = parseInt(process.env["GITHUB_RUN_ID"] ?? "0", 10);
    const runNumber = parseInt(process.env["GITHUB_RUN_NUMBER"] ?? "0", 10);
    const runAttempt = parseInt(process.env["GITHUB_RUN_ATTEMPT"] ?? "1", 10);
    const workflowName = process.env["GITHUB_WORKFLOW"] ?? "unknown";
    const headBranch = process.env["GITHUB_HEAD_REF"] ||
        (process.env["GITHUB_REF"] ?? "").replace(/^refs\/heads\//, "");
    let workflowId = 0;
    let status = "in_progress";
    let conclusion = null;
    let durationMs = 0;
    const jobs = [];
    try {
        const { data: run } = await octokit.rest.actions.getWorkflowRun({
            owner,
            repo,
            run_id: runId,
        });
        workflowId = run.workflow_id;
        status = run.status ?? "in_progress";
        conclusion = run.conclusion ?? null;
        if (run.run_started_at && run.updated_at) {
            const started = new Date(run.run_started_at).getTime();
            const updated = new Date(run.updated_at).getTime();
            durationMs = Math.max(0, updated - started);
        }
        try {
            const { data: jobsData } = await octokit.rest.actions.listJobsForWorkflowRun({
                owner,
                repo,
                run_id: runId,
                per_page: 100,
            });
            for (const job of jobsData.jobs) {
                const steps = (job.steps ?? []).map((step) => ({
                    name: step.name,
                    status: step.status,
                    conclusion: step.conclusion ?? null,
                    number: step.number,
                }));
                jobs.push({
                    name: job.name,
                    status: job.status,
                    conclusion: job.conclusion ?? null,
                    started_at: job.started_at ?? null,
                    completed_at: job.completed_at ?? null,
                    steps,
                });
            }
        }
        catch (jobError) {
            core.warning(`Failed to fetch workflow jobs: ${String(jobError)}`);
        }
    }
    catch (error) {
        core.warning(`Failed to fetch workflow run details: ${String(error)}`);
    }
    const payloadWithoutHash = {
        receipt_type: "github_ci_receipt",
        agent_id: agentId,
        tenant_id: tenantId,
        repository: `${owner}/${repo}`,
        timestamp: nowISO(),
        workflow_name: workflowName,
        workflow_id: workflowId,
        run_id: runId,
        run_number: runNumber,
        run_attempt: runAttempt,
        event: github.context.eventName,
        status,
        conclusion,
        head_sha: github.context.sha,
        head_branch: headBranch,
        jobs,
        duration_ms: durationMs,
    };
    const payloadHash = computePayloadHash(canonicalJson(payloadWithoutHash));
    return {
        ...payloadWithoutHash,
        payload_hash: payloadHash,
    };
}
/**
 * Create a MAIP receipt for the current CI workflow run.
 */
export async function createCIReceipt(client, octokit, agentId, tenantId) {
    const payload = await buildCIPayload(octokit, agentId, tenantId);
    core.info(`Creating CI receipt for workflow '${payload.workflow_name}' ` +
        `run #${payload.run_number} (attempt ${payload.run_attempt})`);
    return client.createReceipt({
        action: `github.ci.${payload.workflow_name}.${payload.run_number}`,
        agent_id: agentId,
        payload: payload,
        receipt_type: "action",
    });
}
//# sourceMappingURL=ci-receipt.js.map