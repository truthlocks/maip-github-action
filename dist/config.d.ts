/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Configuration loader for GitHub Action inputs and environment.
 */
import type { ActionConfig, EventType } from "./types.js";
export declare class ConfigError extends Error {
    constructor(message: string);
}
/**
 * Load configuration from GitHub Action inputs.
 * Validates all required fields and coerces types.
 */
export declare function loadActionConfig(): ActionConfig;
/**
 * Resolve the effective agent ID. Falls back to a deterministic ID
 * derived from the repository full name.
 */
export declare function resolveAgentId(config: ActionConfig): string;
/**
 * Auto-detect event type from GitHub context when event-type is 'auto'.
 */
export declare function detectEventType(): EventType;
//# sourceMappingURL=config.d.ts.map