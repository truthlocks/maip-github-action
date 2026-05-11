/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Generate SVG status badges for MAIP receipts, trust scores, and chain status.
 * Produces shields.io-compatible SVG badges.
 */

import type { BadgeColor, BadgeConfig } from "../types.js";

/**
 * Color hex values matching the shields.io palette.
 */
const COLOR_MAP: Record<BadgeColor, string> = {
  brightgreen: "#4c1",
  green: "#97ca00",
  yellow: "#dfb317",
  orange: "#fe7d37",
  red: "#e05d44",
  blue: "#007ec6",
  lightgrey: "#9f9f9f",
};

/**
 * Approximate the rendered width of a string using character-average metrics.
 * This is intentionally simple — exact SVG text metrics require font data.
 */
function estimateTextWidth(text: string): number {
  return text.length * 6.5 + 10;
}

/**
 * Generate an SVG badge similar to shields.io format.
 */
export function generateBadge(config: BadgeConfig): string {
  const labelWidth = estimateTextWidth(config.label);
  const valueWidth = estimateTextWidth(config.value);
  const totalWidth = labelWidth + valueWidth;
  const colorHex = COLOR_MAP[config.color];

  const escapedLabel = escapeXml(config.label);
  const escapedValue = escapeXml(config.value);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapedLabel}: ${escapedValue}">`,
    `  <title>${escapedLabel}: ${escapedValue}</title>`,
    '  <linearGradient id="s" x2="0" y2="100%">',
    '    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>',
    '    <stop offset="1" stop-opacity=".1"/>',
    "  </linearGradient>",
    `  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>`,
    '  <g clip-path="url(#r)">',
    `    <rect width="${labelWidth}" height="20" fill="#555"/>`,
    `    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${colorHex}"/>`,
    `    <rect width="${totalWidth}" height="20" fill="url(#s)"/>`,
    "  </g>",
    '  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">',
    `    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapedLabel}</text>`,
    `    <text x="${labelWidth / 2}" y="14">${escapedLabel}</text>`,
    `    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapedValue}</text>`,
    `    <text x="${labelWidth + valueWidth / 2}" y="14">${escapedValue}</text>`,
    "  </g>",
    "</svg>",
  ].join("\n");
}

/**
 * Generate a badge indicating receipt verification status.
 */
export function generateVerificationBadge(valid: boolean): string {
  return generateBadge({
    label: "MAIP",
    value: valid ? "verified" : "unverified",
    color: valid ? "brightgreen" : "red",
  });
}

/**
 * Generate a badge showing the agent trust score.
 */
export function generateTrustBadge(trustScore: number): string {
  const percentage = `${(trustScore * 100).toFixed(0)}%`;
  const color = trustScoreToColor(trustScore);

  return generateBadge({
    label: "Trust",
    value: percentage,
    color,
  });
}

/**
 * Generate a badge showing the total receipt count.
 */
export function generateReceiptCountBadge(count: number): string {
  return generateBadge({
    label: "Receipts",
    value: String(count),
    color: "blue",
  });
}

/**
 * Generate a badge showing receipt chain status.
 */
export function generateChainBadge(intact: boolean): string {
  return generateBadge({
    label: "Chain",
    value: intact ? "intact" : "broken",
    color: intact ? "green" : "red",
  });
}

/**
 * Map a trust score (0-1) to a badge color.
 */
function trustScoreToColor(score: number): BadgeColor {
  if (score >= 0.8) return "brightgreen";
  if (score >= 0.6) return "green";
  if (score >= 0.4) return "yellow";
  if (score >= 0.2) return "orange";
  return "red";
}

/**
 * Escape XML special characters in badge text.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
