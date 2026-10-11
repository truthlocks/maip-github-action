/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Utility functions for receipt payload hashing and serialization.
 */
/**
 * Produce canonical JSON: sorted keys, no whitespace, deterministic output.
 * This ensures identical payloads always produce the same hash regardless
 * of property insertion order.
 */
export declare function canonicalJson(obj: unknown): string;
/**
 * Compute SHA-256 hash of a string, returned as a hex digest.
 */
export declare function computePayloadHash(data: string): string;
/**
 * Return current ISO 8601 timestamp.
 */
export declare function nowISO(): string;
/**
 * Hash a potentially long string (like a PR body) to avoid storing
 * sensitive or large content in receipts.
 */
export declare function hashContent(content: string): string;
/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 */
export declare function truncate(value: string, maxLength: number): string;
//# sourceMappingURL=utils.d.ts.map