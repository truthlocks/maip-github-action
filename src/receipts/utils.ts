/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Utility functions for receipt payload hashing and serialization.
 */

import { createHash } from "node:crypto";

/**
 * Produce canonical JSON: sorted keys, no whitespace, deterministic output.
 * This ensures identical payloads always produce the same hash regardless
 * of property insertion order.
 */
export function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, sortedReplacer);
}

/**
 * Compute SHA-256 hash of a string, returned as a hex digest.
 */
export function computePayloadHash(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Return current ISO 8601 timestamp.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Hash a potentially long string (like a PR body) to avoid storing
 * sensitive or large content in receipts.
 */
export function hashContent(content: string): string {
  return computePayloadHash(content);
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength - 3) + "...";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * JSON.stringify replacer that sorts object keys alphabetically.
 * Handles nested objects and arrays recursively.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }

  return value;
}
