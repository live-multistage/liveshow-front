export type BlueprintFieldType = 'string' | 'number' | 'boolean' | 'datetime' | 'uuid' | 'url';
export type BlueprintFieldClass = 'PUBLIC' | 'INTERNAL' | 'PERSONAL';
export type BlueprintNodeKind = 'trigger' | 'data' | 'action' | 'core';

export interface BlueprintNodeInstance {
  id: string;
  node: string;
  version: number;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}
export interface BlueprintEdge { from: string; to: string; port?: 'true' | 'false' }
export interface BlueprintGraph { schemaVersion: 1; nodes: BlueprintNodeInstance[]; edges: BlueprintEdge[] }

export type BlueprintConfigField =
  | { kind: 'ref'; type: BlueprintFieldType; required: boolean; description: string }
  | { kind: 'text'; template: boolean; acceptsPersonal: boolean; maxLength: number; required: boolean; description: string }
  | { kind: 'enum'; values: string[]; required: boolean; description: string }
  | { kind: 'uuid'; required: boolean; description: string }
  | { kind: 'datetimeExpr'; required: boolean; description: string }
  | { kind: 'condition'; required: boolean; description: string };

export interface BlueprintOutputField { type: BlueprintFieldType; class: BlueprintFieldClass; description: string }

export interface BlueprintCatalogEntry {
  key: string;
  version: number;
  kind: BlueprintNodeKind;
  label: string;
  description: string;
  config: Record<string, BlueprintConfigField>;
  outputs: Record<string, BlueprintOutputField>;
  event?: string;
  ports?: Array<'true' | 'false'>;
}

export type BlueprintAnalysisCode =
  | 'INVALID_GRAPH' | 'NO_TRIGGER' | 'MULTIPLE_TRIGGERS' | 'UNREACHABLE_NODE' | 'CYCLE'
  | 'DANGLING_PATH' | 'CONDITION_PORTS' | 'UNKNOWN_NODE' | 'INVALID_CONFIG' | 'BAD_REFERENCE'
  | 'TYPE_MISMATCH' | 'RESTRICTED_FIELD' | 'PERSONAL_NOT_ALLOWED' | 'MISSING_DEDUPE_KEY'
  | 'WAIT_TOO_LONG' | 'TOO_MANY_NODES';
export interface BlueprintAnalysisError { nodeId?: string; code: BlueprintAnalysisCode; message: string }
export interface BlueprintAnalysis { ok: boolean; errors: BlueprintAnalysisError[] }

export type BlueprintStatus = 'ACTIVE' | 'INACTIVE' | 'INVALID';
export interface BlueprintRunCounts { started: number; completed: number; cancelled: number; failed: number }
export interface BlueprintSummary {
  id: string;
  name: string;
  description: string;
  status: BlueprintStatus;
  activeVersionId: string | null;
  latestVersion: number | null;
  counts7d: BlueprintRunCounts;
  updatedAt: string;
}
export interface BlueprintVersionDto {
  id: string;
  version: number;
  graph: BlueprintGraph;
  analysis: BlueprintAnalysis;
  publishedAt: string | null;
}
export interface BlueprintDetail extends BlueprintSummary { versions: BlueprintVersionDto[] }

export type BlueprintRunStatus = 'RUNNING' | 'WAITING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export interface BlueprintRunStepDto {
  nodeId: string;
  nodeKey: string;
  status: 'OK' | 'SKIPPED' | 'FAILED';
  outcome: string | null;
  errorCode: string | null;
  startedAt: string;
  finishedAt: string | null;
}
export interface BlueprintRunDto {
  id: string;
  versionId: string;
  version: number;
  status: BlueprintRunStatus;
  currentNodeId: string | null;
  wakeAt: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  steps: BlueprintRunStepDto[];
}
export interface BlueprintRunsPage { items: BlueprintRunDto[]; nextCursor: string | null }

export interface CreateBlueprintRequest { name: string; description?: string }
export interface SaveBlueprintVersionRequest { graph: BlueprintGraph }
export interface ActivateBlueprintRequest { versionId: string }
