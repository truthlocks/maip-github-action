/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for SVG badge generation.
 */

import { describe, it, expect } from "vitest";
import {
  generateBadge,
  generateVerificationBadge,
  generateTrustBadge,
  generateReceiptCountBadge,
  generateChainBadge,
} from "../../src/badges/badge-generator.js";

describe("generateBadge", () => {
  it("should generate valid SVG", () => {
    const svg = generateBadge({ label: "Test", value: "pass", color: "green" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("should include label and value text", () => {
    const svg = generateBadge({
      label: "MAIP",
      value: "verified",
      color: "brightgreen",
    });
    expect(svg).toContain("MAIP");
    expect(svg).toContain("verified");
  });

  it("should use correct color fill", () => {
    const svg = generateBadge({ label: "Test", value: "fail", color: "red" });
    expect(svg).toContain("#e05d44");
  });

  it("should escape XML special characters", () => {
    const svg = generateBadge({ label: "A<B", value: "1&2", color: "blue" });
    expect(svg).toContain("A&lt;B");
    expect(svg).toContain("1&amp;2");
    // Ensure raw unescaped "<B" does not appear anywhere in the SVG
    // The escaped form "A&lt;B" contains the literal substring "<B" only as part of "&lt;B"
    const withoutEscaped = svg.replace(/&lt;/g, "");
    expect(withoutEscaped).not.toContain("<B");
  });

  it("should include accessible title and aria-label", () => {
    const svg = generateBadge({ label: "Status", value: "ok", color: "green" });
    expect(svg).toContain("<title>Status: ok</title>");
    expect(svg).toContain('aria-label="Status: ok"');
  });
});

describe("generateVerificationBadge", () => {
  it("should show 'verified' in green for valid receipts", () => {
    const svg = generateVerificationBadge(true);
    expect(svg).toContain("verified");
    expect(svg).toContain("#4c1");
  });

  it("should show 'unverified' in red for invalid receipts", () => {
    const svg = generateVerificationBadge(false);
    expect(svg).toContain("unverified");
    expect(svg).toContain("#e05d44");
  });
});

describe("generateTrustBadge", () => {
  it("should show percentage for high trust score with green", () => {
    const svg = generateTrustBadge(0.92);
    expect(svg).toContain("92%");
    expect(svg).toContain("#4c1");
  });

  it("should use yellow for medium trust scores", () => {
    const svg = generateTrustBadge(0.45);
    expect(svg).toContain("45%");
    expect(svg).toContain("#dfb317");
  });

  it("should use red for low trust scores", () => {
    const svg = generateTrustBadge(0.15);
    expect(svg).toContain("15%");
    expect(svg).toContain("#e05d44");
  });
});

describe("generateReceiptCountBadge", () => {
  it("should show count in blue", () => {
    const svg = generateReceiptCountBadge(47);
    expect(svg).toContain("47");
    expect(svg).toContain("Receipts");
    expect(svg).toContain("#007ec6");
  });
});

describe("generateChainBadge", () => {
  it("should show 'intact' in green for valid chains", () => {
    const svg = generateChainBadge(true);
    expect(svg).toContain("intact");
    expect(svg).toContain("#97ca00");
  });

  it("should show 'broken' in red for broken chains", () => {
    const svg = generateChainBadge(false);
    expect(svg).toContain("broken");
    expect(svg).toContain("#e05d44");
  });
});
