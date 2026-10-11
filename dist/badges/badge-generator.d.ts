/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate SVG status badges for MAIP receipts, trust scores, and chain status.
 * Produces shields.io-compatible SVG badges.
 */
import type { BadgeConfig } from "../types.js";
/**
 * Generate an SVG badge similar to shields.io format.
 */
export declare function generateBadge(config: BadgeConfig): string;
/**
 * Generate a badge indicating receipt verification status.
 */
export declare function generateVerificationBadge(valid: boolean): string;
/**
 * Generate a badge showing the agent trust score.
 */
export declare function generateTrustBadge(trustScore: number): string;
/**
 * Generate a badge showing the total receipt count.
 */
export declare function generateReceiptCountBadge(count: number): string;
/**
 * Generate a badge showing receipt chain status.
 */
export declare function generateChainBadge(intact: boolean): string;
//# sourceMappingURL=badge-generator.d.ts.map