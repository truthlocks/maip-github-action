/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Create GitHub Check Runs showing agent trust score details.
 */
import * as github from "@actions/github";
import type { TrustScoreResponse } from "../types.js";
/**
 * Create a GitHub Check Run showing the trust score for an agent.
 */
export declare function createTrustCheck(octokit: ReturnType<typeof github.getOctokit>, trustScore: TrustScoreResponse): Promise<void>;
//# sourceMappingURL=trust-check.d.ts.map