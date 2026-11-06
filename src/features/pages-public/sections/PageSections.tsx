import type { ComponentType } from 'react';
import type { PageDocument, PageSection, PageSectionPropsByType, PageSectionType, PublicPage } from '@live-show/api-contracts';
import { SectionFrame } from './SectionFrame';
import { HeroSection } from './HeroSection';
import { AudienceSection } from './AudienceSection';
import { TextSection } from './TextSection';
import { FeaturesSection } from './FeaturesSection';
import { HowSection } from './HowSection';
import { MediaSection } from './MediaSection';
import { StatsSection } from './StatsSection';

export type SectionComponent<T extends PageSectionType> = ComponentType<{
  props: PageSectionPropsByType[T];
  resolved: PublicPage['resolved'];
}>;

// Partial on purpose: U3 adds rail/featured/pricing/faq/final. Missing types render nothing.
const REGISTRY: { [K in PageSectionType]?: SectionComponent<K> } = {
  hero: HeroSection,
  audience: AudienceSection,
  text: TextSection,
  features: FeaturesSection,
  how: HowSection,
  media: MediaSection,
  stats: StatsSection,
};

const VARIANT = { hero: 'hero', audience: 'strip', final: 'final' } as const;

export function PageSections({ document, resolved }: { document: PageDocument; resolved: PublicPage['resolved'] }) {
  return (
    <>
      {document.sections.map((section) => {
        if (section.hidden) return null;
        const Component = REGISTRY[section.type] as SectionComponent<PageSectionType> | undefined;
        if (!Component) return null;
        const variant = VARIANT[section.type as keyof typeof VARIANT];
        return (
          <SectionFrame key={section.id} id={section.id} appearance={section.appearance} variant={variant}>
            <Component props={(section as PageSection).props} resolved={resolved} />
          </SectionFrame>
        );
      })}
    </>
  );
}
