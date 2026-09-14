import type { BlueprintFieldType, BlueprintOutputField } from '@live-show/api-contracts';

// Mirrors the orchestrator's domain/field-types.ts (structural type matching
// over the same contract shape) so the ref picker rejects mismatches the
// analyzer would also reject.
export const isList = (t: BlueprintFieldType): t is { list: BlueprintFieldType } => typeof t === 'object' && 'list' in t;
export const isObject = (t: BlueprintFieldType): t is { object: Record<string, BlueprintOutputField> } => typeof t === 'object' && 'object' in t;

export function sameType(a: BlueprintFieldType, b: BlueprintFieldType): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if (isList(a) && isList(b)) return sameType(a.list, b.list);
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a.object).sort();
    const kb = Object.keys(b.object).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && sameType(a.object[k].type, b.object[k].type));
  }
  return false;
}

export function typeLabel(t: BlueprintFieldType): string {
  if (typeof t === 'string') return t;
  return isList(t) ? `list<${typeLabel(t.list)}>` : 'object';
}
