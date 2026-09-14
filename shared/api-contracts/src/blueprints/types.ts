export type BlueprintScalarType = 'string' | 'number' | 'boolean' | 'datetime' | 'uuid' | 'url' | 'json';
export type BlueprintFieldType = BlueprintScalarType | { list: BlueprintFieldType } | { object: Record<string, BlueprintOutputField> };
export type BlueprintFieldClass = 'PUBLIC' | 'INTERNAL' | 'PERSONAL';
export type BlueprintNodeKind = 'trigger' | 'data' | 'action' | 'core';

export interface BlueprintNodeInstance {
  id: string;
  node: string;
  version: number;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}
export interface BlueprintEdge { from: string; to: string; port?: string }
export interface BlueprintGraph { schemaVersion: 1; nodes: BlueprintNodeInstance[]; edges: BlueprintEdge[] }

export type BlueprintConfigField =
  | { kind: 'ref'; type: BlueprintFieldType; required: boolean; description: string }
  | { kind: 'text'; template: boolean; acceptsPersonal: boolean; maxLength: number; required: boolean; description: string }
  | { kind: 'enum'; values: string[]; required: boolean; description: string }
  | { kind: 'uuid'; required: boolean; description: string }
  | { kind: 'datetimeExpr'; required: boolean; description: string }
  | { kind: 'condition'; required: boolean; description: string }
  | { kind: 'number'; required: boolean; description: string; min?: number; max?: number }
  | { kind: 'boolean'; required: boolean; description: string }
  | { kind: 'duration'; required: boolean; description: string }
  | { kind: 'keyValueList'; required: boolean; description: string; template: boolean; maxItems: number }
  | { kind: 'secret'; required: boolean; description: string }
  | { kind: 'cases'; required: boolean; description: string; maxCases: number };

export interface BlueprintSwitchCase { match: string | number | boolean; port: string }

export interface BlueprintOutputField { type: BlueprintFieldType; class: BlueprintFieldClass; description: string; port?: string }

export interface BlueprintCatalogEntry {
  key: string;
  version: number;
  kind: BlueprintNodeKind;
  label: string;
  description: string;
  config: Record<string, BlueprintConfigField>;
  outputs: Record<string, BlueprintOutputField>;
  event?: string;
  ports?: string[];
  optionalPorts?: string[];
  mode?: 'dispatch' | 'call';
  secretFields?: string[];
  dynamicPorts?: 'switch';
  dynamicOutputs?: 'forEach';
}

export type BlueprintAnalysisCode =
  | 'INVALID_GRAPH' | 'NO_TRIGGER' | 'MULTIPLE_TRIGGERS' | 'UNREACHABLE_NODE' | 'CYCLE'
  | 'DANGLING_PATH' | 'CONDITION_PORTS' | 'UNKNOWN_NODE' | 'INVALID_CONFIG' | 'BAD_REFERENCE'
  | 'TYPE_MISMATCH' | 'RESTRICTED_FIELD' | 'PERSONAL_NOT_ALLOWED' | 'MISSING_DEDUPE_KEY'
  | 'WAIT_TOO_LONG' | 'TOO_MANY_NODES' | 'PORT_EDGES' | 'SECRET_NOT_ALLOWED' | 'JSON_PATH'
  | 'FOREACH_DEPTH' | 'SWITCH_CASES';
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
export interface BlueprintRunChildrenCounts { total: number; running: number; completed: number; cancelled: number; failed: number }
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
  parentRunId: string | null;
  itemIndex: number | null;
  children: BlueprintRunChildrenCounts | null;
}
export interface BlueprintRunsPage { items: BlueprintRunDto[]; nextCursor: string | null }

export interface CreateBlueprintRequest { name: string; description?: string }
export interface SaveBlueprintVersionRequest { graph: BlueprintGraph }
export interface ActivateBlueprintRequest { versionId: string }

export interface BlueprintSecretSummary { name: string; updatedAt: string }
export interface SetBlueprintSecretRequest { value: string }
export interface BlueprintKeyValue { name: string; value: string }
