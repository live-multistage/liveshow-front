// Where to draw the pulsing highlight for the current tour step (design
// brief §"Destaque do alvo"). Steps 1–7 point at, in order: the palette item
// (node not added yet) → the inspector field to fill → the node's card (once
// everything but a connection is in place). Step 8 has no in-canvas target —
// the toolbar chip carries its own highlight in EditorToolbar.
import { parseRef } from '../expr-builders';
import type { EditorState } from '../useEditorGraph';
import {
  CHAIN_STEP2, CHAIN_STEP3, CHAIN_STEP4, CHAIN_STEP5, CHAIN_STEP6, findChain, type TourStepId,
} from './tourSteps';

export interface TourHighlight {
  paletteKey?: string;
  nodeId?: string;
  field?: { nodeId: string; name: string };
}

const refFilled = (value: unknown, nodeId: string, field: string) => {
  const ref = parseRef(value);
  return !!ref && ref.nodeId === nodeId && ref.field === field;
};

export function tourHighlight(step: TourStepId, state: EditorState): TourHighlight {
  switch (step) {
    case 1: {
      const t = state.nodes.find((n) => n.node === 'wishlist.itemAdded');
      if (!t) return { paletteKey: 'wishlist.itemAdded' };
      if (!(typeof t.config.dedupeKey === 'string' && t.config.dedupeKey.trim())) return { field: { nodeId: t.id, name: 'dedupeKey' } };
      return { nodeId: t.id };
    }
    case 2: {
      const chain = findChain(state, CHAIN_STEP2);
      if (!chain) return { paletteKey: 'core.delay' };
      const [, delayNode] = chain;
      const duration = delayNode.config.duration;
      if (!(typeof duration === 'string' && /^\d+(m|h|d)$/.test(duration))) return { field: { nodeId: delayNode.id, name: 'duration' } };
      return { nodeId: delayNode.id };
    }
    case 3: {
      const chain = findChain(state, CHAIN_STEP3);
      if (!chain) return { paletteKey: 'wishlist.stillSaved' };
      const [trigger, , stillSaved] = chain;
      if (!refFilled(stillSaved.config.userId, trigger.id, 'userId')) return { field: { nodeId: stillSaved.id, name: 'userId' } };
      if (!refFilled(stillSaved.config.eventId, trigger.id, 'eventId')) return { field: { nodeId: stillSaved.id, name: 'eventId' } };
      return { nodeId: stillSaved.id };
    }
    case 4: {
      const chain = findChain(state, CHAIN_STEP4);
      if (!chain) return { paletteKey: 'ticketing.hasAccess' };
      const [trigger, , , hasAccess] = chain;
      if (!refFilled(hasAccess.config.userId, trigger.id, 'userId')) return { field: { nodeId: hasAccess.id, name: 'userId' } };
      if (!refFilled(hasAccess.config.eventId, trigger.id, 'eventId')) return { field: { nodeId: hasAccess.id, name: 'eventId' } };
      return { nodeId: hasAccess.id };
    }
    case 5: {
      const chain = findChain(state, CHAIN_STEP5);
      if (!chain) return { paletteKey: 'events.byId' };
      const [trigger, , , , eventsById] = chain;
      if (!refFilled(eventsById.config.eventId, trigger.id, 'eventId')) return { field: { nodeId: eventsById.id, name: 'eventId' } };
      return { nodeId: eventsById.id };
    }
    case 6: {
      const chain = findChain(state, CHAIN_STEP6);
      if (!chain) return { paletteKey: 'core.condition' };
      const condition = chain[5];
      return { field: { nodeId: condition.id, name: 'expression' } };
    }
    case 7: {
      const chain = findChain(state, CHAIN_STEP6);
      if (!chain) return {};
      const [trigger, , , , , condition] = chain;
      const trueEdge = state.edges.find((e) => e.from === condition.id && e.port === 'true');
      const notif = trueEdge && state.nodes.find((n) => n.id === trueEdge.to && n.node === 'notifications.inApp');
      if (!notif) return { paletteKey: 'notifications.inApp' };
      if (!refFilled(notif.config.recipient, trigger.id, 'userId')) return { field: { nodeId: notif.id, name: 'recipient' } };
      return { nodeId: notif.id };
    }
    default:
      return {};
  }
}
