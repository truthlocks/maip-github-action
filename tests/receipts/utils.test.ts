/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for receipt utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  canonicalJson,
  computePayloadHash,
  hashContent,
  truncate,
  nowISO,
} from "../../src/receipts/utils.js";

describe("canonicalJson", () => {
  it("should sort object keys alphabetically", () => {
    const obj = { zebra: 1, apple: 2, mango: 3 };
    const result = canonicalJson(obj);
    expect(result).toBe('{"apple":2,"mango":3,"zebra":1}');
  });

  it("should sort nested object keys", () => {
    const obj = { b: { z: 1, a: 2 }, a: { y: 3, x: 4 } };
    const result = canonicalJson(obj);
    expect(result).toBe('{"a":{"x":4,"y":3},"b":{"a":2,"z":1}}');
  });

  it("should not reorder arrays", () => {
    const obj = { items: [3, 1, 2] };
    const result = canonicalJson(obj);
    expect(result).toBe('{"items":[3,1,2]}');
  });

  it("should produce identical output for identical data regardless of insertion order", () => {
    const obj1: Record<string, unknown> = {};
    obj1["a"] = 1;
    obj1["b"] = 2;
    obj1["c"] = 3;

    const obj2: Record<string, unknown> = {};
    obj2["c"] = 3;
    obj2["a"] = 1;
    obj2["b"] = 2;

    expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
  });

  it("should handle null and undefined values", () => {
    const obj = { a: null, b: undefined, c: 1 };
    const result = canonicalJson(obj);
    expect(result).toContain('"a":null');
    expect(result).toContain('"c":1');
  });
});

describe("computePayloadHash", () => {
  it("should produce a 64-character hex SHA-256 hash", () => {
    const hash = computePayloadHash("hello world");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should produce deterministic output", () => {
    const hash1 = computePayloadHash("test input");
    const hash2 = computePayloadHash("test input");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different inputs", () => {
    const hash1 = computePayloadHash("input A");
    const hash2 = computePayloadHash("input B");
    expect(hash1).not.toBe(hash2);
  });

  it("should produce the known SHA-256 for an empty string", () => {
    const hash = computePayloadHash("");
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("hashContent", () => {
  it("should hash content using SHA-256", () => {
    const hash = hashContent("sensitive PR body content");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should produce different hashes for different content", () => {
    const hash1 = hashContent("content A");
    const hash2 = hashContent("content B");
    expect(hash1).not.toBe(hash2);
  });
});

describe("truncate", () => {
  it("should not truncate strings within the limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("should truncate strings exceeding the limit with ellipsis", () => {
    expect(truncate("hello world this is a long string", 15)).toBe(
      "hello world ...",
    );
  });

  it("should handle exact-length strings", () => {
    expect(truncate("exact", 5)).toBe("exact");
  });
});

describe("nowISO", () => {
  it("should return a valid ISO 8601 string", () => {
    const ts = nowISO();
    const parsed = Date.parse(ts);
    expect(isNaN(parsed)).toBe(false);
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
