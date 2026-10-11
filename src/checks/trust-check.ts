/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Create GitHub Check Runs showing agent trust score details.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import type { TrustScoreResponse } from "../types.js";

const CHECK_NAME = "MAIP Trust Score";

/**
 * Map trust score to a check conclusion.
 * >= 0.7 success, >= 0.4 neutral, < 0.4 failure
 */
function scoreToConclusion(score: number): "success" | "neutral" | "failure" {
  if (score >= 0.7) return "success";
  if (score >= 0.4) return "neutral";
  return "failure";
}

/**
 * Render a score bar using Unicode block characters.
 */
function scoreBar(score: number, width: number = 20): string {
  const filled = Math.round(score * width);
  const empty = width - filled;
  return (
    "\u2588".repeat(filled) +
    "\u2591".repeat(empty) +
    ` ${(score * 100).toFixed(1)}%`
  );
}

/**
 * Create a GitHub Check Run showing the trust score for an agent.
 */
export async function createTrustCheck(
  octokit: ReturnType<typeof github.getOctokit>,
  trustScore: TrustScoreResponse,
): Promise<void> {
  const { owner, repo } = github.context.repo;
  const sha = github.context.sha;

  const conclusion = scoreToConclusion(trustScore.trust_score);
  const title = `Trust Score: ${(trustScore.trust_score * 100).toFixed(1)}% (${trustScore.trust_level})`;

  const factors = trustScore.score_components ?? trustScore.factors;
  const text = [
    "## MAIP Agent Trust Score Report",
    `Agent: ${trustScore.agent_id}`,
    `Trust level: ${trustScore.trust_level}`,
    `Overall score: ${scoreBar(trustScore.trust_score)}`,
    "Factors returned by the server:",
    factors ? JSON.stringify(factors, null, 2) : "No computed factor breakdown is available.",
    "A trust score is not signature verification or a compliance certification.",
  ].join("\n\n");

  const summary = `Agent \`${trustScore.agent_id}\` trust score: ${(trustScore.trust_score * 100).toFixed(1)}% (${trustScore.trust_level})`;

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

    core.info(
      `Created check run '${CHECK_NAME}' with conclusion: ${conclusion}`,
    );
  } catch (error: unknown) {
    core.warning(`Failed to create trust check run: ${String(error)}`);
  }
}
