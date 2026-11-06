import { EventGrid, Placeholder } from './EventCards';
import type { ElementView } from './types';

// The title is drawn by the sibling heading the v1 upgrade emits; drawing it here too would show it twice.
// TODO(V2-O3): the back keys `resolved.rails` by element id; /p maps the v1 section ids until then (see resolved.ts).
export const EventRail: ElementView<'eventRail'> = ({ props, common, ctx }) => {
  const events = ctx.resolved.rails[props.id] ?? [];
  if (events.length === 0) return ctx.mode === 'editor' ? <Placeholder>Trilho de eventos</Placeholder> : null;
  return <EventGrid events={events} className={common.className} />;
};
