import type { ReactNode } from 'react';
import {
  STYLE_KEYS_BY_TYPE, type ElementType, type PageDocumentV2, type PageElement, type ResponsiveStyle,
} from '@live-show/api-contracts';
import { BgImage } from './BgImage';
import { Button } from './Button';
import { Column } from './Column';
import { Columns } from './Columns';
import { Counter } from './Counter';
import { Divider } from './Divider';
import { EventRail } from './EventRail';
import { Faq } from './Faq';
import { FeaturedEvent } from './FeaturedEvent';
import { Group } from './Group';
import { Heading } from './Heading';
import { IconList } from './IconList';
import { Image } from './Image';
import { Label } from './Label';
import { LiveNow } from './LiveNow';
import { Plan } from './Plan';
import { Section } from './Section';
import { Spacer } from './Spacer';
import { Text } from './Text';
import { Video } from './Video';
import { childrenOf } from './resolved';
import { styleClassNames } from './style/style-classes';
import type { ElementView, RenderContext } from './types';
import styles from './elements.module.scss';

const REGISTRY: { [K in ElementType]: ElementView<K> } = {
  section: Section, columns: Columns, column: Column, group: Group,
  heading: Heading, text: Text, label: Label, button: Button, image: Image, video: Video, divider: Divider, spacer: Spacer,
  iconList: IconList, counter: Counter, faq: Faq, plan: Plan,
  eventRail: EventRail, featuredEvent: FeaturedEvent, liveNow: LiveNow,
};

// Desktop-level defaults (tokens only) for what the author left unset; document values always win.
const DEFAULT_STYLE: Partial<Record<ElementType, Record<string, unknown>>> = {
  section: { pl: 'xl', pr: 'xl', width: 'contained', gap: 'xl' },
  columns: { cols: 2, gap: 'xl' },
  column: { gap: 'lg' },
  group: { gap: 'sm' },
  heading: { typo: 'display' },
  text: { typo: 'md' },
  label: { typo: 'label' },
  button: { variant: 'primary', size: 'md' },
  image: { aspect: '16:9' },
  video: { aspect: '16:9' },
  divider: { color: 'border', my: 'lg' },
  spacer: { h: 'xl' },
  iconList: { typo: 'md', gap: 'sm' },
  counter: { typo: 'display' },
  plan: { p: 'xl' },
};

function resolveStyle(type: ElementType, style: ResponsiveStyle | undefined): ResponsiveStyle {
  const desktop = { ...DEFAULT_STYLE[type], ...style?.desktop } as ResponsiveStyle['desktop'];
  // Columns collapse to one column on mobile unless the author chose a count there.
  if (type === 'columns' && style?.mobile?.cols === undefined) {
    return { ...style, desktop, mobile: { ...style?.mobile, cols: 1 } };
  }
  return { ...style, desktop };
}

/**
 * `slot` replaces the rendered `items`: the editor (Puck) hands slot elements a ready-made drop zone instead of child elements.
 */
export function ElementRenderer({ element, ctx, slot }: { element: PageElement; ctx: RenderContext; slot?: ReactNode }) {
  const { type, props } = element;
  const View = REGISTRY[type] as ElementView<ElementType> | undefined;
  if (!View) return null;
  const hidden = props.hidden;
  if (ctx.mode === 'public' && hidden?.desktop && hidden.tablet && hidden.mobile) return null;

  const style = props.style as ResponsiveStyle | undefined;
  const common = { id: props.anchor, className: styleClassNames(type, resolveStyle(type, style), hidden).join(' ') };
  const items = childrenOf(element);
  const hasBg = (STYLE_KEYS_BY_TYPE[type] as readonly string[]).includes('bg');
  return (
    <View
      props={props as never}
      common={common}
      ctx={ctx}
      background={hasBg ? <BgImage style={style} /> : undefined}
    >
      {slot ?? items?.map((child) => <ElementRenderer key={child.props.id} element={child} ctx={ctx} />)}
    </View>
  );
}

/** The `page` container alone, for the editor canvas: Puck supplies the sections as children. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className={styles.root}>{children}</div>;
}

/** Page root: the `page` container that the tablet/mobile style families query. */
export function PageRoot({ document, ctx }: { document: PageDocumentV2; ctx: RenderContext }) {
  return (
    <div className={styles.root}>
      {document.content.map((section) => <ElementRenderer key={section.props.id} element={section} ctx={ctx} />)}
    </div>
  );
}
