import { EventGrid, Placeholder } from './EventCards';
import type { ElementView } from './types';

// TODO(V2-O3): the contract has no liveNow bucket yet; reads `resolved.rails[elementId]` and keeps only live events.
// `emptyText` is not drawn in public (no data = nothing rendered); the editor UI shows it.
export const LiveNow: ElementView<'liveNow'> = ({ props, common, ctx }) => {
  const events = (ctx.resolved.rails[props.id] ?? []).filter((e) => e.isLive).slice(0, props.limit);
  if (events.length === 0) return ctx.mode === 'editor' ? <Placeholder>{props.emptyText}</Placeholder> : null;
  return <EventGrid events={events} className={common.className} />;
};
