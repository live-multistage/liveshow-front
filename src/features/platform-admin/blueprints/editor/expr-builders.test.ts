import { describe, expect, it } from 'vitest';
import buyers from './__fixtures__/reminder-buyers.json';
import savers from './__fixtures__/reminder-savers.json';
import { conditionToRules, formatWait, isCompleteRule, parseRef, parseWait, rulesToCondition } from './expr-builders';

const conditionOf = (g: { nodes: Array<{ node: string; config: Record<string, unknown> }> }) =>
  g.nodes.find((n) => n.node === 'core.condition')?.config.expression;
const waitOf = (g: { nodes: Array<{ node: string; config: Record<string, unknown> }> }) =>
  g.nodes.find((n) => n.node === 'core.waitUntil')?.config.at;

describe('condition builder', () => {
  it.each([['buyers', buyers], ['savers', savers]])('round-trips the %s fixture condition', (_n, g) => {
    const expr = conditionOf(g);
    const rules = conditionToRules(expr);
    expect(rules).not.toBeNull();
    expect(rulesToCondition(rules!)).toEqual(expr);
  });

  it('reads the buyers condition as two and-joined rules with "now"', () => {
    expect(conditionToRules(conditionOf(buyers))).toEqual({
      join: 'and',
      rules: [{ left: '{{e2.status}}', op: 'eq', right: 'PUBLISHED' }, { left: '{{e2.startsAt}}', op: 'gt', right: 'now' }],
    });
  });

  it('emits or / exists and drops an empty rule list', () => {
    expect(rulesToCondition({ join: 'or', rules: [{ left: '{{a.hasAccess}}', op: 'exists', right: null }, { left: '{{s.saved}}', op: 'eq', right: true }] }))
      .toEqual({ or: [{ exists: '{{a.hasAccess}}' }, { eq: ['{{s.saved}}', true] }] });
    expect(rulesToCondition({ join: 'and', rules: [] })).toBeUndefined();
    expect(conditionToRules(undefined)).toEqual({ join: 'and', rules: [] });
  });

  it('never serializes an incomplete rule (empty left, empty right, or unpicked boolean)', () => {
    expect(rulesToCondition({ join: 'and', rules: [{ left: '', op: 'eq', right: '' }] })).toBeUndefined();
    expect(rulesToCondition({ join: 'and', rules: [{ left: '{{e1.status}}', op: 'eq', right: '' }] })).toBeUndefined();
    expect(rulesToCondition({ join: 'or', rules: [{ left: '{{e1.live}}', op: 'eq', right: '' }, { left: '{{e1.status}}', op: 'eq', right: 'LIVE' }] }))
      .toEqual({ or: [{ eq: ['{{e1.status}}', 'LIVE'] }] });
    expect(isCompleteRule({ left: '', op: 'eq', right: 'x' })).toBe(false);
    expect(isCompleteRule({ left: '{{e1.done}}', op: 'exists', right: null })).toBe(true);
    expect(isCompleteRule({ left: '{{e1.status}}', op: 'eq', right: '' })).toBe(false);
  });

  it('rejects operands typed wrong for the field (R22-class: analyzer cannot catch a string in a number/datetime slot)', () => {
    // number: a pt-BR decimal comma typed by the user lands here as a string until converted.
    expect(isCompleteRule({ left: '{{e1.price}}', op: 'gt', right: '1,5' }, 'number')).toBe(false);
    expect(isCompleteRule({ left: '{{e1.price}}', op: 'gt', right: 1.5 }, 'number')).toBe(true);
    // datetime: only "now" or an ISO-ish string (date + hour:minute) counts.
    expect(isCompleteRule({ left: '{{e1.startsAt}}', op: 'gt', right: '20/09/2026 10:00' }, 'datetime')).toBe(false);
    expect(isCompleteRule({ left: '{{e1.startsAt}}', op: 'gt', right: '2026-09-20' }, 'datetime')).toBe(false);
    expect(isCompleteRule({ left: '{{e1.startsAt}}', op: 'gt', right: '2026-09-20T10:00' }, 'datetime')).toBe(true);
    expect(isCompleteRule({ left: '{{e1.startsAt}}', op: 'gt', right: 'now' }, 'datetime')).toBe(true);
    // boolean: only a real boolean, never the string "true"/"false".
    expect(isCompleteRule({ left: '{{e1.live}}', op: 'eq', right: 'true' }, 'boolean')).toBe(false);
    expect(isCompleteRule({ left: '{{e1.live}}', op: 'eq', right: true }, 'boolean')).toBe(true);

    expect(rulesToCondition({ join: 'and', rules: [{ left: '{{e1.price}}', op: 'gt', right: '1,5' }] }, () => 'number')).toBeUndefined();
    expect(rulesToCondition({ join: 'and', rules: [{ left: '{{e1.price}}', op: 'gt', right: 1.5 }] }, () => 'number'))
      .toEqual({ and: [{ gt: ['{{e1.price}}', 1.5] }] });
  });

  it('wraps a bare leaf and refuses shapes the flat builder cannot show', () => {
    expect(conditionToRules({ neq: ['{{e1.status}}', 'LIVE'] })).toEqual({ join: 'and', rules: [{ left: '{{e1.status}}', op: 'neq', right: 'LIVE' }] });
    expect(conditionToRules({ not: { eq: ['a', 'b'] } })).toBeNull();
    expect(conditionToRules({ and: [{ or: [{ eq: ['a', 'b'] }] }] })).toBeNull();
    expect(conditionToRules({ in: ['{{e1.status}}', ['LIVE']] })).toBeNull();
  });
});

describe('wait builder', () => {
  it.each([['buyers', buyers, '{{e1.startsAt}} - 2h'], ['savers', savers, '{{e1.startsAt}} - 24h']])('round-trips the %s fixture', (_n, g, expected) => {
    const at = waitOf(g);
    expect(at).toBe(expected);
    expect(formatWait(parseWait(at)!)).toBe(at);
  });

  it('parses offsets and bare refs; formats zero offset as the bare ref', () => {
    expect(parseWait('{{e1.startsAt}} + 30m')).toEqual({ ref: '{{e1.startsAt}}', sign: '+', amount: 30, unit: 'm' });
    expect(parseWait('{{e1.startsAt}}')).toEqual({ ref: '{{e1.startsAt}}', sign: '-', amount: 0, unit: 'h' });
    expect(formatWait({ ref: '{{e1.startsAt}}', sign: '+', amount: 0, unit: 'd' })).toBe('{{e1.startsAt}}');
    expect(formatWait({ ref: '{{e1.startsAt}}', sign: '-', amount: 1, unit: 'd' })).toBe('{{e1.startsAt}} - 1d');
  });

  it('does not parse absolute datetimes or junk', () => {
    expect(parseWait('2026-10-02T18:00:00Z')).toBeNull();
    expect(parseWait(42)).toBeNull();
  });
});

describe('parseRef', () => {
  it('reads a single {{node.field}} reference', () => {
    expect(parseRef('{{ t.userId }}')).toEqual({ nodeId: 't', field: 'userId' });
    expect(parseRef('x {{t.userId}}')).toBeNull();
  });
});
