import { EventGrid, EventSkeleton, Placeholder } from './EventCards';
import type { ElementView } from './types';

// `emptyText` is not drawn in public (no data = nothing rendered); the editor UI shows it.
export const LiveNow: ElementView<'liveNow'> = ({ props, common, ctx }) => {
  const events = (ctx.resolved.live[props.id] ?? []).slice(0, props.limit);
  if (events.length > 0) return <EventGrid events={events} className={common.className} />;
  if (ctx.mode === 'public') return null;
  if (ctx.loading?.includes(props.id)) return <EventSkeleton count={props.limit ?? 4} className={common.className} />;
  return <Placeholder>{props.emptyText}</Placeholder>;
};
