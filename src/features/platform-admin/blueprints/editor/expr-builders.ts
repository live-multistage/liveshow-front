// JSON shapes accepted by the orchestrator analyzer:
// - condition: domain/condition.ts (ConditionExpr)
// - datetimeExpr: domain/expressions.ts ("{{node.field}} ± N(m|h|d)" or ISO)

import type { BlueprintFieldType } from '@live-show/api-contracts';

export type Operand = string | number | boolean | null;
// Mirrors domain/expressions.ts ISO_DATETIME: the runtime only requires the
// date + hour:minute prefix, so a `datetime-local` input's value already matches.
export const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
export type RuleOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists';
export const RULE_OPS: RuleOp[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists'];
const BINARY = new Set<string>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);

export interface Rule { left: string; op: RuleOp; right: Operand }
export interface RuleSet { join: 'and' | 'or'; rules: Rule[] }

const REF = /^\{\{\s*([A-Za-z0-9_-]+)\.([A-Za-z0-9_]+)\s*\}\}$/;
const WAIT = /^\s*(\{\{\s*[A-Za-z0-9_-]+\.[A-Za-z0-9_]+\s*\}\})\s*(?:([+-])\s*(\d+)\s*([mhd]))?\s*$/;

export function parseRef(value: unknown): { nodeId: string; field: string } | null {
  if (typeof value !== 'string') return null;
  const m = REF.exec(value.trim());
  return m ? { nodeId: m[1], field: m[2] } : null;
}

export const refOf = (nodeId: string, field: string) => `{{${nodeId}.${field}}}`;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isOperand = (v: unknown): v is Operand => v === null || ['string', 'number', 'boolean'].includes(typeof v);

function leafToRule(expr: unknown): Rule | null {
  if (!isObject(expr) || Object.keys(expr).length !== 1) return null;
  const [op, arg] = Object.entries(expr)[0];
  if (op === 'exists') return typeof arg === 'string' ? { left: arg, op, right: null } : null;
  if (!BINARY.has(op) || !Array.isArray(arg) || arg.length !== 2 || typeof arg[0] !== 'string' || !isOperand(arg[1])) return null;
  return { left: arg[0], op: op as RuleOp, right: arg[1] };
}

/** The flat "rules joined by E/OU" model the builder edits; null when the expression is richer (not, in, nesting). */
export function conditionToRules(expr: unknown): RuleSet | null {
  if (expr === undefined) return { join: 'and', rules: [] };
  if (isObject(expr) && Object.keys(expr).length === 1 && ('and' in expr || 'or' in expr)) {
    const join = 'and' in expr ? 'and' : 'or';
    const list = expr[join];
    if (!Array.isArray(list)) return null;
    const rules = list.map(leafToRule);
    return rules.every((r): r is Rule => r !== null) ? { join, rules } : null;
  }
  const single = leafToRule(expr);
  return single ? { join: 'and', rules: [single] } : null;
}

/**
 * A rule is safe to serialize once its left side is a real ref and (for binary
 * ops) its right side is both filled in AND typed the way condition.ts's
 * `comparable()` compares it at runtime — otherwise gt/gte/lt/lte silently
 * return false and eq/neq silently return the wrong thing (R22-class bug).
 */
export function isCompleteRule(r: Rule, type?: BlueprintFieldType): boolean {
  if (!parseRef(r.left)) return false;
  if (r.op === 'exists') return true;
  if (type === 'number') return typeof r.right === 'number' && Number.isFinite(r.right);
  if (type === 'boolean') return typeof r.right === 'boolean';
  if (type === 'datetime') return r.right === 'now' || (typeof r.right === 'string' && ISO_DATETIME.test(r.right));
  return r.right !== '' && r.right !== null;
}

// Drops incomplete rows so a half-filled row (e.g. right away from "+ Adicionar
// regra") never reaches the analyzer as a always-true/false `'' === ''` leaf.
export function rulesToCondition(set: RuleSet, typeOf?: (left: string) => BlueprintFieldType | undefined): Record<string, unknown> | undefined {
  const complete = set.rules.filter((r) => isCompleteRule(r, typeOf?.(r.left)));
  if (complete.length === 0) return undefined;
  return { [set.join]: complete.map((r) => (r.op === 'exists' ? { exists: r.left } : { [r.op]: [r.left, r.right] })) };
}

export type WaitUnit = 'm' | 'h' | 'd';
export interface WaitExpr { ref: string; sign: '-' | '+'; amount: number; unit: WaitUnit }

export function parseWait(value: unknown): WaitExpr | null {
  if (typeof value !== 'string') return null;
  const m = WAIT.exec(value);
  if (!m) return null;
  return m[2]
    ? { ref: m[1], sign: m[2] as '-' | '+', amount: Number(m[3]), unit: m[4] as WaitUnit }
    : { ref: m[1], sign: '-', amount: 0, unit: 'h' };
}

export function formatWait(w: WaitExpr): string {
  return w.amount > 0 ? `${w.ref} ${w.sign} ${w.amount}${w.unit}` : w.ref;
}
