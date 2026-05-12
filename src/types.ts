/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Shared TypeScript types for the MAIP GitHub Action.
 */

// ---------------------------------------------------------------------------
// Action Configuration
// ---------------------------------------------------------------------------

export type OperationMode =
  | "receipt"
  | "verify"
  | "check"
  | "comment"
  | "badge";

export type EventType =
  | "commit"
  | "pr"
  | "release"
  | "ci"
  | "artifact"
  | "auto";

export interface ActionConfig {
  readonly maipApiUrl: string;
  readonly maipApiKey: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly mode: OperationMode;
  readonly eventType: EventType;
  readonly receiptId: string;
  readonly createCheck: boolean;
  readonly postComment: boolean;
  readonly githubToken: string;
}

// ---------------------------------------------------------------------------
// MAIP API Types
// ---------------------------------------------------------------------------

export interface MAIPConfig {
  readonly apiUrl: string;
  readonly apiKey: string;
  readonly tenantId: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Receipt Types
// ---------------------------------------------------------------------------

export type ReceiptType =
  | "github_commit_receipt"
  | "github_pr_receipt"
  | "github_release_receipt"
  | "github_ci_receipt"
  | "github_artifact_receipt";

export interface BaseReceiptPayload {
  readonly receipt_type: ReceiptType;
  readonly agent_id: string;
  readonly tenant_id: string;
  readonly repository: string;
  readonly payload_hash: string;
  readonly timestamp: string;
}

export interface CommitReceiptPayload extends BaseReceiptPayload {
  readonly receipt_type: "github_commit_receipt";
  readonly commit_sha: string;
  readonly author: string;
  readonly committer: string;
  readonly message: string;
  readonly tree_sha: string;
  readonly parent_shas: readonly string[];
  readonly files_added: number;
  readonly files_modified: number;
  readonly files_removed: number;
  readonly additions: number;
  readonly deletions: number;
  readonly branch: string;
}

export interface PRReceiptPayload extends BaseReceiptPayload {
  readonly receipt_type: "github_pr_receipt";
  readonly pr_number: number;
  readonly title: string;
  readonly body_hash: string;
  readonly author: string;
  readonly base_branch: string;
  readonly head_branch: string;
  readonly head_sha: string;
  readonly commits_count: number;
  readonly changed_files: number;
  readonly additions: number;
  readonly deletions: number;
  readonly reviewers: readonly string[];
  readonly approved_by: readonly string[];
  readonly merge_commit_sha: string | null;
  readonly status: string;
}

export interface ReleaseReceiptPayload extends BaseReceiptPayload {
  readonly receipt_type: "github_release_receipt";
  readonly tag_name: string;
  readonly release_name: string;
  readonly target_commitish: string;
  readonly draft: boolean;
  readonly prerelease: boolean;
  readonly author: string;
  readonly body_hash: string;
  readonly assets: readonly ReleaseAsset[];
}

export interface ReleaseAsset {
  readonly name: string;
  readonly size: number;
  readonly content_type: string;
  readonly download_url: string;
}

export interface CIReceiptPayload extends BaseReceiptPayload {
  readonly receipt_type: "github_ci_receipt";
  readonly workflow_name: string;
  readonly workflow_id: number;
  readonly run_id: number;
  readonly run_number: number;
  readonly run_attempt: number;
  readonly event: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly head_sha: string;
  readonly head_branch: string;
  readonly jobs: readonly CIJob[];
  readonly duration_ms: number;
}

export interface CIJob {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly steps: readonly CIStep[];
}

export interface CIStep {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly number: number;
}

export interface ArtifactReceiptPayload extends BaseReceiptPayload {
  readonly receipt_type: "github_artifact_receipt";
  readonly artifact_name: string;
  readonly artifact_hash: string;
  readonly artifact_size: number;
  readonly download_url: string;
  readonly run_id: number;
  readonly workflow_name: string;
  readonly head_sha: string;
}

export type ReceiptPayload =
  | CommitReceiptPayload
  | PRReceiptPayload
  | ReleaseReceiptPayload
  | CIReceiptPayload
  | ArtifactReceiptPayload;

// ---------------------------------------------------------------------------
// MAIP API Request/Response
// ---------------------------------------------------------------------------

export interface CreateReceiptRequest {
  readonly action: string;
  readonly agent_id: string;
  readonly payload: Record<string, unknown>;
  readonly receipt_type: string;
}

export interface ReceiptResponse {
  readonly receipt_id: string;
  readonly tenant_id: string;
  readonly agent_id: string;
  readonly action: string;
  readonly receipt_type: string;
  readonly payload: Record<string, unknown>;
  readonly inputs_hash: string;
  readonly outputs_hash: string;
  readonly delegation_chain_hash: string;
  readonly attestation_id: string;
  readonly previous_receipt_id: string | null;
  readonly status: "valid" | "pending" | "revoked" | "expired" | "superseded";
  readonly duration_ms: number | null;
  readonly error_code: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface VerifyReceiptResponse {
  readonly valid: boolean;
  readonly verdict: string;
  readonly details: string;
  readonly warnings: readonly string[];
}

export interface TrustScoreResponse {
  readonly agent_id: string;
  readonly trust_level: string;
  readonly trust_score: number;
  readonly score_components: {
    readonly reputation: number;
    readonly key_health: number;
    readonly delegation_depth: number;
    readonly verification_history: number;
    readonly multi_witness: number;
    readonly anomaly_penalty: number;
  };
  readonly trust_ceiling: number;
  readonly delegation_depth: number;
  readonly computed_at: string;
  readonly valid_until: string;
}

// ---------------------------------------------------------------------------
// Check Run Types
// ---------------------------------------------------------------------------

export interface CheckRunResult {
  readonly name: string;
  readonly conclusion: "success" | "failure" | "neutral";
  readonly title: string;
  readonly summary: string;
  readonly text: string;
}

// ---------------------------------------------------------------------------
// Badge Types
// ---------------------------------------------------------------------------

export type BadgeColor =
  | "brightgreen"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "blue"
  | "lightgrey";

export interface BadgeConfig {
  readonly label: string;
  readonly value: string;
  readonly color: BadgeColor;
}
