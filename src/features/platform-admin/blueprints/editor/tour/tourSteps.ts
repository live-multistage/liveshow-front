// Logic for the guided "lembrete 24h depois de salvar" tutorial. No UI here —
// see design/briefs/2026-09-14-blueprints-editor-tutorial.md for the screen.
import type { BlueprintNodeKind } from '@live-show/api-contracts';
import {
  type EditorNode, type EditorState, type XY, editorReducer,
} from '../useEditorGraph';
import {
  type Operand, type RuleOp, conditionToRules, parseRef, refOf,
} from '../expr-builders';

export type TourStepId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface TourContext {
  state: EditorState;
  /** null = never validated (Validar) since the last edit. */
  analysisOk: boolean | null;
  published: boolean;
  active: boolean;
}

export interface TourStep {
  id: TourStepId;
  titleKey: string;
  bodyKey: string;
  hintKey: string | null;
  nodeKey: string | null;
  check(ctx: TourContext): boolean;
  autoApply?(state: EditorState): EditorState;
}

const i18n = (id: TourStepId, part: 'title' | 'body' | 'hint') => `platformAdmin.blueprints.tour.steps.${id}.${part}`;

/** A portless-edge chain of nodes matching `keys` in order, starting from any node of `keys[0]`. */
export function findChain(state: EditorState, keys: string[]): EditorNode[] | null {
  for (const start of state.nodes.filter((n) => n.node === keys[0])) {
    const chain = [start];
    let ok = true;
    for (let i = 1; i < keys.length; i += 1) {
      const edge = state.edges.find((e) => e.from === chain[i - 1].id && !e.port);
      const next = edge && state.nodes.find((n) => n.id === edge.to && n.node === keys[i]);
      if (!next) { ok = false; break; }
      chain.push(next);
    }
    if (ok) return chain;
  }
  return null;
}

function refPointsTo(value: unknown, nodeId: string, field: string): boolean {
  const ref = parseRef(value);
  return !!ref && ref.nodeId === nodeId && ref.field === field && ref.path.length === 0;
}

// Exported so the tour UI can locate a step's target node/field without
// re-deriving the chain shape.
export const CHAIN_STEP2 = ['wishlist.itemAdded', 'core.delay'];
export const CHAIN_STEP3 = [...CHAIN_STEP2, 'wishlist.stillSaved'];
export const CHAIN_STEP4 = [...CHAIN_STEP3, 'ticketing.hasAccess'];
export const CHAIN_STEP5 = [...CHAIN_STEP4, 'events.byId'];
export const CHAIN_STEP6 = [...CHAIN_STEP5, 'core.condition'];

// --- autoApply helpers (used only by "Fazer por mim") --------------------

const KIND: Record<string, BlueprintNodeKind> = {
  'wishlist.itemAdded': 'trigger', 'core.delay': 'core', 'wishlist.stillSaved': 'data',
  'ticketing.hasAccess': 'data', 'events.byId': 'data', 'core.condition': 'core',
  'notifications.inApp': 'action', 'core.end': 'core',
};

function withConfig(state: EditorState, id: string, config: Record<string, unknown>): EditorState {
  return { ...state, nodes: state.nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...config } } : n)) };
}

function addNode(state: EditorState, key: string, position: XY): { state: EditorState; id: string } {
  const next = editorReducer(state, { type: 'add', entry: { key, version: 1, kind: KIND[key] }, position });
  return { state: next, id: next.nodes[next.nodes.length - 1].id };
}

function connect(state: EditorState, from: string, to: string, port?: string): EditorState {
  return editorReducer(state, { type: 'connect', from, to, port });
}

/**
 * Ensures a correct portless chain for `keys[0..index]` exists, reusing it if
 * already there. ponytail: doesn't try to repair a partially-wrong graph —
 * "Fazer por mim" only fires on the first incomplete step, so everything
 * before it is already correct; rebuild-from-scratch is the lazy fallback.
 */
function ensureUpTo(state: EditorState, keys: string[]): { state: EditorState; ids: string[] } {
  // Keep the longest chain prefix the user already built and only append what
  // is missing, so "Fazer por mim" never leaves duplicate nodes behind.
  let prefix: EditorNode[] = [];
  for (let n = keys.length; n > 0 && prefix.length === 0; n -= 1) prefix = findChain(state, keys.slice(0, n)) ?? [];
  let s = state;
  const ids = prefix.map((n) => n.id);
  let pos: XY = prefix.length ? prefix[prefix.length - 1].position : { x: 0, y: 0 };
  for (let i = ids.length; i < keys.length; i += 1) {
    const added = addNode(s, keys[i], i === 0 ? { x: 0, y: 0 } : { x: pos.x + 240, y: pos.y });
    s = i === 0 ? added.state : connect(added.state, ids[i - 1], added.id);
    ids.push(added.id);
    pos = s.nodes.find((n) => n.id === added.id)!.position;
  }
  return { state: s, ids };
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 0, titleKey: i18n(0, 'title'), bodyKey: i18n(0, 'body'), hintKey: null, nodeKey: null,
    check: () => true,
  },
  {
    id: 1, titleKey: i18n(1, 'title'), bodyKey: i18n(1, 'body'), hintKey: i18n(1, 'hint'), nodeKey: 'wishlist.itemAdded',
    check: (ctx) => {
      const t = ctx.state.nodes.find((n) => n.node === 'wishlist.itemAdded');
      return !!t && typeof t.config.dedupeKey === 'string' && (t.config.dedupeKey as string).trim().length > 0;
    },
    autoApply: (state) => {
      const { state: s, ids: [t] } = ensureUpTo(state, ['wishlist.itemAdded']);
      return withConfig(s, t, { dedupeKey: `saved-24h:{{${t}.eventId}}:{{${t}.userId}}` });
    },
  },
  {
    id: 2, titleKey: i18n(2, 'title'), bodyKey: i18n(2, 'body'), hintKey: i18n(2, 'hint'), nodeKey: 'core.delay',
    check: (ctx) => {
      const chain = findChain(ctx.state, CHAIN_STEP2);
      const duration = chain?.[1].config.duration;
      return typeof duration === 'string' && /^\d+(m|h|d)$/.test(duration);
    },
    autoApply: (state) => {
      const { state: s, ids } = ensureUpTo(state, CHAIN_STEP2);
      return withConfig(s, ids[1], { duration: '24h' });
    },
  },
  {
    id: 3, titleKey: i18n(3, 'title'), bodyKey: i18n(3, 'body'), hintKey: i18n(3, 'hint'), nodeKey: 'wishlist.stillSaved',
    check: (ctx) => {
      const chain = findChain(ctx.state, CHAIN_STEP3);
      if (!chain) return false;
      const [trigger, , stillSaved] = chain;
      return refPointsTo(stillSaved.config.userId, trigger.id, 'userId') && refPointsTo(stillSaved.config.eventId, trigger.id, 'eventId');
    },
    autoApply: (state) => {
      const { state: s, ids } = ensureUpTo(state, CHAIN_STEP3);
      const [trigger, , stillSaved] = ids;
      return withConfig(s, stillSaved, { userId: refOf(trigger, 'userId'), eventId: refOf(trigger, 'eventId') });
    },
  },
  {
    id: 4, titleKey: i18n(4, 'title'), bodyKey: i18n(4, 'body'), hintKey: null, nodeKey: 'ticketing.hasAccess',
    check: (ctx) => {
      const chain = findChain(ctx.state, CHAIN_STEP4);
      if (!chain) return false;
      const [trigger, , , hasAccess] = chain;
      return refPointsTo(hasAccess.config.userId, trigger.id, 'userId') && refPointsTo(hasAccess.config.eventId, trigger.id, 'eventId');
    },
    autoApply: (state) => {
      const { state: s, ids } = ensureUpTo(state, CHAIN_STEP4);
      const [trigger, , , hasAccess] = ids;
      return withConfig(s, hasAccess, { userId: refOf(trigger, 'userId'), eventId: refOf(trigger, 'eventId') });
    },
  },
  {
    id: 5, titleKey: i18n(5, 'title'), bodyKey: i18n(5, 'body'), hintKey: null, nodeKey: 'events.byId',
    check: (ctx) => {
      const chain = findChain(ctx.state, CHAIN_STEP5);
      if (!chain) return false;
      const [trigger, , , , eventsById] = chain;
      return refPointsTo(eventsById.config.eventId, trigger.id, 'eventId');
    },
    autoApply: (state) => {
      const { state: s, ids } = ensureUpTo(state, CHAIN_STEP5);
      return withConfig(s, ids[4], { eventId: refOf(ids[0], 'eventId') });
    },
  },
  {
    id: 6, titleKey: i18n(6, 'title'), bodyKey: i18n(6, 'body'), hintKey: i18n(6, 'hint'), nodeKey: 'core.condition',
    check: (ctx) => {
      const chain = findChain(ctx.state, CHAIN_STEP6);
      if (!chain) return false;
      const [, , stillSaved, hasAccess, eventsById, condition] = chain;
      const ruleSet = conditionToRules(condition.config.expression);
      if (!ruleSet || ruleSet.join !== 'and' || ruleSet.rules.length !== 4) return false;
      const has = (left: string, op: RuleOp, right: Operand) => ruleSet.rules.some((r) => r.left === left && r.op === op && r.right === right);
      return has(refOf(stillSaved.id, 'saved'), 'eq', true)
        && has(refOf(hasAccess.id, 'hasAccess'), 'eq', false)
        && has(refOf(eventsById.id, 'status'), 'eq', 'PUBLISHED')
        && has(refOf(eventsById.id, 'startsAt'), 'gt', 'now');
    },
    autoApply: (state) => {
      const { state: s, ids } = ensureUpTo(state, CHAIN_STEP6);
      const [, , stillSaved, hasAccess, eventsById, condition] = ids;
      const expression = {
        and: [
          { eq: [refOf(stillSaved, 'saved'), true] },
          { eq: [refOf(hasAccess, 'hasAccess'), false] },
          { eq: [refOf(eventsById, 'status'), 'PUBLISHED'] },
          { gt: [refOf(eventsById, 'startsAt'), 'now'] },
        ],
      };
      return withConfig(s, condition, { expression });
    },
  },
  {
    id: 7, titleKey: i18n(7, 'title'), bodyKey: i18n(7, 'body'), hintKey: i18n(7, 'hint'), nodeKey: 'notifications.inApp',
    check: (ctx) => {
      const chain = findChain(ctx.state, CHAIN_STEP6);
      if (!chain) return false;
      const [trigger, , , , , condition] = chain;
      const trueEdge = ctx.state.edges.find((e) => e.from === condition.id && e.port === 'true');
      const notif = trueEdge && ctx.state.nodes.find((n) => n.id === trueEdge.to && n.node === 'notifications.inApp');
      if (!notif || !refPointsTo(notif.config.recipient, trigger.id, 'userId')) return false;
      const notifNext = ctx.state.edges.find((e) => e.from === notif.id && !e.port);
      const end1 = notifNext && ctx.state.nodes.find((n) => n.id === notifNext.to && n.node === 'core.end');
      const falseEdge = ctx.state.edges.find((e) => e.from === condition.id && e.port === 'false');
      const end2 = falseEdge && ctx.state.nodes.find((n) => n.id === falseEdge.to && n.node === 'core.end');
      return !!end1 && !!end2 && end1.id !== end2.id;
    },
    autoApply: (state) => {
      const { state: s0, ids } = ensureUpTo(state, CHAIN_STEP6);
      const [trigger, , , , eventsById, condition] = ids;
      const condPos = s0.nodes.find((n) => n.id === condition)!.position;

      const trueEdge = s0.edges.find((e) => e.from === condition && e.port === 'true');
      const existingNotif = trueEdge && s0.nodes.find((n) => n.id === trueEdge.to && n.node === 'notifications.inApp');
      let s = s0;
      let notif = existingNotif?.id;
      if (!notif) {
        const added = addNode(s, 'notifications.inApp', { x: condPos.x + 240, y: condPos.y - 90 });
        s = connect(added.state, condition, added.id, 'true');
        notif = added.id;
      }
      s = withConfig(s, notif, {
        recipient: refOf(trigger, 'userId'),
        type: 'RECOMMENDATION',
        title: `Ainda pensando em {{${eventsById}.title}}?`,
        message: 'Ainda dá tempo de garantir seu ingresso.',
        link: `/events/{{${eventsById}.slug}}`,
      });

      const notifPos = s.nodes.find((n) => n.id === notif)!.position;
      const notifNextEdge = s.edges.find((e) => e.from === notif && !e.port);
      const existingEnd1 = notifNextEdge && s.nodes.find((n) => n.id === notifNextEdge.to && n.node === 'core.end');
      let end1 = existingEnd1?.id;
      if (!end1) {
        const added = addNode(s, 'core.end', { x: notifPos.x + 240, y: notifPos.y });
        s = connect(added.state, notif as string, added.id);
        end1 = added.id;
      }

      const falseEdge = s.edges.find((e) => e.from === condition && e.port === 'false');
      const existingEnd2 = falseEdge && s.nodes.find((n) => n.id === falseEdge.to && n.node === 'core.end' && n.id !== end1);
      let end2 = existingEnd2?.id;
      if (!end2) {
        const added = addNode(s, 'core.end', { x: condPos.x + 240, y: condPos.y + 120 });
        s = connect(added.state, condition, added.id, 'false');
        end2 = added.id;
      }
      return s;
    },
  },
  {
    id: 8, titleKey: i18n(8, 'title'), bodyKey: i18n(8, 'body'), hintKey: i18n(8, 'hint'), nodeKey: null,
    check: (ctx) => ctx.analysisOk === true && ctx.published,
  },
];

export function firstIncompleteStep(ctx: TourContext): TourStepId {
  for (const step of TOUR_STEPS) if (!step.check(ctx)) return step.id;
  return 8;
}
