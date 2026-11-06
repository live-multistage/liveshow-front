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
import { RailSection } from './RailSection';
import { FeaturedSection } from './FeaturedSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { FinalSection } from './FinalSection';

export type SectionComponent<T extends PageSectionType> = ComponentType<{
  props: PageSectionPropsByType[T];
  sectionId: string;
  resolved: PublicPage['resolved'];
}>;

const REGISTRY: { [K in PageSectionType]: SectionComponent<K> } = {
  hero: HeroSection,
  audience: AudienceSection,
  text: TextSection,
  features: FeaturesSection,
  how: HowSection,
  media: MediaSection,
  stats: StatsSection,
  rail: RailSection,
  featured: FeaturedSection,
  pricing: PricingSection,
  faq: FaqSection,
  final: FinalSection,
};

const VARIANT = { hero: 'hero', audience: 'strip', final: 'final' } as const;

export function PageSections({ document, resolved }: { document: PageDocument; resolved: PublicPage['resolved'] }) {
  return (
    <>
      {document.sections.map((section) => {
        if (section.hidden) return null;
        const Component = REGISTRY[section.type] as SectionComponent<PageSectionType>;
        // Data-driven sections with nothing to show drop the whole frame (no empty padded band).
        if (section.type === 'rail' && !resolved.rails[section.id]?.length) return null;
        if (section.type === 'featured' && !resolved.featured[section.id]) return null;
        const variant = VARIANT[section.type as keyof typeof VARIANT];
        return (
          <SectionFrame key={section.id} id={section.id} appearance={section.appearance} variant={variant}>
            <Component sectionId={section.id} props={(section as PageSection).props} resolved={resolved} />
          </SectionFrame>
        );
      })}
    </>
  );
}
