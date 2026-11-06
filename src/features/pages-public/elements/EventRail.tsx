import { EventGrid, EventSkeleton, Notice, Placeholder } from './EventCards';
import { DEFAULT_EDITOR_LABELS, type ElementView } from './types';

// The title is drawn by the sibling heading the v1 upgrade emits; drawing it here too would show it twice.
// TODO(V2-O3): the back keys `resolved.rails` by element id; /p maps the v1 section ids until then (see resolved.ts).
export const EventRail: ElementView<'eventRail'> = ({ props, common, ctx }) => {
  const events = ctx.resolved.rails[props.id];
  if (events?.length) return <EventGrid events={events} className={common.className} />;
  if (ctx.mode === 'public') return null;
  if (ctx.loading?.includes(props.id)) return <EventSkeleton count={props.limit ?? 4} className={common.className} />;
  const labels = ctx.labels ?? DEFAULT_EDITOR_LABELS;
  if (!events) return <Placeholder>{labels.railPlaceholder}</Placeholder>;
  const { kind, id } = props.source ?? { kind: 'live' };
  // Organizations and artists are ids here: only a category reads well as the filter.
  const title = kind === 'live' ? labels.railNoneLive : kind === 'category' && id ? labels.railNoneCategory(id) : labels.railNoneFilter;
  return (
    <Notice
      title={title}
      text={labels.railHidden}
    />
  );
};
