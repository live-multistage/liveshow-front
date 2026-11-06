import { EventGrid, EventSkeleton, Notice, Placeholder } from './EventCards';
import type { ElementView } from './types';

// The title is drawn by the sibling heading the v1 upgrade emits; drawing it here too would show it twice.
// TODO(V2-O3): the back keys `resolved.rails` by element id; /p maps the v1 section ids until then (see resolved.ts).
export const EventRail: ElementView<'eventRail'> = ({ props, common, ctx }) => {
  const events = ctx.resolved.rails[props.id];
  if (events?.length) return <EventGrid events={events} className={common.className} />;
  if (ctx.mode === 'public') return null;
  if (ctx.loading?.includes(props.id)) return <EventSkeleton count={props.limit ?? 4} className={common.className} />;
  if (!events) return <Placeholder>Trilho de eventos</Placeholder>;
  const { kind, id } = props.source ?? { kind: 'live' };
  // Organizations and artists are ids here: only a category reads well as the filter.
  const title = kind === 'live' ? 'Nenhum evento ao vivo agora' : kind === 'category' && id ? `Nenhum evento para “${id}”` : 'Nenhum evento para este filtro';
  return (
    <Notice
      title={title}
      text="Na página publicada este trilho fica oculto até haver eventos."
    />
  );
};
