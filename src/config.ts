/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Configuration loader for GitHub Action inputs and environment.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import type { ActionConfig, EventType, OperationMode } from "./types.js";

const VALID_MODES: readonly OperationMode[] = [
  "receipt",
  "verify",
  "check",
  "comment",
  "badge",
];

const VALID_EVENT_TYPES: readonly EventType[] = [
  "commit",
  "pr",
  "release",
  "ci",
  "artifact",
  "auto",
];

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Load configuration from GitHub Action inputs.
 * Validates all required fields and coerces types.
 */
export function loadActionConfig(): ActionConfig {
  const maipApiUrl =
    core.getInput("maip-api-url", { required: false }) ||
    "https://api.truthlocks.com/v1/machine-identity";
  const maipApiKey = core.getInput("maip-api-key", { required: true });
  const tenantId = core.getInput("maip-tenant-id", { required: true });
  const agentId = core.getInput("maip-agent-id", { required: false }) || "";
  const mode = core.getInput("mode", { required: false }) || "receipt";
  const eventType = core.getInput("event-type", { required: false }) || "auto";
  const receiptId = core.getInput("receipt-id", { required: false }) || "";
  const createCheck =
    core.getInput("create-check", { required: false }) !== "false";
  const postComment =
    core.getInput("post-comment", { required: false }) !== "false";
  const githubToken =
    core.getInput("github-token", { required: false }) ||
    process.env["GITHUB_TOKEN"] ||
    "";

  if (!maipApiKey) {
    throw new ConfigError("maip-api-key is required");
  }

  if (!tenantId) {
    throw new ConfigError("maip-tenant-id is required");
  }

  if (!VALID_MODES.includes(mode as OperationMode)) {
    throw new ConfigError(
      `Invalid mode '${mode}'. Must be one of: ${VALID_MODES.join(", ")}`,
    );
  }

  if (!VALID_EVENT_TYPES.includes(eventType as EventType)) {
    throw new ConfigError(
      `Invalid event-type '${eventType}'. Must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
    );
  }

  if (mode === "verify" && !receiptId) {
    throw new ConfigError("receipt-id is required when mode is 'verify'");
  }

  return {
    maipApiUrl: maipApiUrl.replace(/\/+$/, ""),
    maipApiKey,
    tenantId,
    agentId,
    mode: mode as OperationMode,
    eventType: eventType as EventType,
    receiptId,
    createCheck,
    postComment,
    githubToken,
  };
}

/**
 * Resolve the effective agent ID. Falls back to a deterministic ID
 * derived from the repository full name.
 */
export function resolveAgentId(config: ActionConfig): string {
  if (config.agentId) {
    return config.agentId;
  }

  const repo = `${github.context.repo.owner}/${github.context.repo.repo}`;
  return `github-${repo.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}`;
}

/**
 * Auto-detect event type from GitHub context when event-type is 'auto'.
 */
export function detectEventType(): EventType {
  const eventName = github.context.eventName;

  switch (eventName) {
    case "push":
      return "commit";
    case "pull_request":
    case "pull_request_target":
    case "pull_request_review":
      return "pr";
    case "release":
      return "release";
    case "workflow_run":
    case "workflow_dispatch":
    case "schedule":
    case "check_suite":
      return "ci";
    default:
      return "ci";
  }
}
