import { ELEMENT_TYPES, type ElementType, type PageDocumentV2, type StyleKey } from './document-v2';
import type { PageTreeIssue } from './schemas-v2';

// Editor profiles (SDD §6.3). The profile comes from the page OWNER, not from the actor, and is enforced on save by the
// back as well as by the editor.
export interface PageEditorProfile {
  elementTypes: readonly ElementType[];
  maxElements: number;
  maxDepth: number;
  style: { backgroundImage: boolean; gradients: boolean; shadows: boolean; orgPrimary: boolean };
  /** 'ownOrganization': eventRail/featuredEvent may only show the owner organization's events. */
  dataScope: 'any' | 'ownOrganization';
  canLock: boolean;
}

export const PAGE_EDITOR_PROFILES = {
  platform: {
    elementTypes: ELEMENT_TYPES, maxElements: 400, maxDepth: 6,
    style: { backgroundImage: true, gradients: true, shadows: true, orgPrimary: false },
    dataScope: 'any', canLock: true,
  },
  organization: {
    elementTypes: ELEMENT_TYPES, maxElements: 200, maxDepth: 5,
    style: { backgroundImage: true, gradients: false, shadows: false, orgPrimary: true },
    dataScope: 'ownOrganization', canLock: false,
  },
} as const satisfies Record<string, PageEditorProfile>;
export type PageEditorProfileName = keyof typeof PAGE_EDITOR_PROFILES;

export type PageOwner = { kind: 'platform' } | { kind: 'organization'; organizationId: string };

export const profileNameOf = (owner: PageOwner): PageEditorProfileName => (owner.kind === 'platform' ? 'platform' : 'organization');

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const SLOT_TYPES: readonly string[] = ['section', 'columns', 'column', 'group'];
const BREAKPOINT_KEYS = ['desktop', 'tablet', 'mobile'] as const;
const formatPath = (segments: (string | number)[]) =>
  segments.reduce<string>((acc, s) => (typeof s === 'number' ? `${acc}[${s}]` : acc ? `${acc}.${s}` : s), '');

/**
 * Checks an (already schema-valid) v2 document against an editor profile. Returns issues with `path`/`elementId`.
 *
 * `ownerOrganizationId` is required for `dataScope: 'ownOrganization'`. `featuredEvent` is NOT checked here: the event's
 * organization is not in the document, so only the back (which can load the event) can refuse a foreign one.
 */
export function validatePageAgainstProfile(
  doc: PageDocumentV2,
  profileName: PageEditorProfileName,
  ownerOrganizationId?: string,
): PageTreeIssue[] {
  const profile: PageEditorProfile = PAGE_EDITOR_PROFILES[profileName];
  const issues: PageTreeIssue[] = [];
  let count = 0;

  const walk = (node: unknown, segments: (string | number)[], depth: number) => {
    if (!isRecord(node) || !isRecord(node.props)) return;
    count += 1;
    const type = node.type as ElementType;
    const props = node.props;
    const elementId = typeof props.id === 'string' ? props.id : undefined;
    const fail = (sub: (string | number)[], message: string) => {
      const all = [...segments, ...sub];
      issues.push({ path: formatPath(all), segments: all, message, ...(elementId ? { elementId } : {}) });
    };

    if (!profile.elementTypes.includes(type)) fail(['type'], `"${type}" não é permitido neste tipo de página.`);
    if (depth > profile.maxDepth) fail([], `Profundidade máxima de ${profile.maxDepth} níveis.`);
    if ('locked' in props) {
      fail(['props', 'locked'], profile.canLock ? 'Bloqueio de elemento ainda não é suportado.' : 'Esta página não pode bloquear elementos.');
    }

    if (isRecord(props.style)) {
      for (const bp of BREAKPOINT_KEYS) {
        const style = props.style[bp];
        if (!isRecord(style)) continue;
        const at = (key: StyleKey) => ['props', 'style', bp, key];
        if (!profile.style.shadows && style.shadow !== undefined && style.shadow !== 'none') fail(at('shadow'), 'Sombras não são permitidas neste tipo de página.');
        const bg = style.bg;
        if (isRecord(bg) && bg.kind === 'gradient' && !profile.style.gradients) fail(at('bg'), 'Gradientes não são permitidos neste tipo de página.');
        if (isRecord(bg) && bg.kind === 'image' && !profile.style.backgroundImage) fail(at('bg'), 'Imagem de fundo não é permitida neste tipo de página.');
      }
    }

    if (type === 'eventRail' && profile.dataScope === 'ownOrganization' && isRecord(props.source)) {
      const { kind, id } = props.source;
      if (kind === 'organization' && (ownerOrganizationId === undefined || id !== ownerOrganizationId)) {
        fail(['props', 'source'], 'A faixa só pode mostrar eventos da sua organização.');
      }
    }

    if (SLOT_TYPES.includes(type) && Array.isArray(props.items)) {
      props.items.forEach((child, i) => walk(child, [...segments, 'props', 'items', i], depth + 1));
    }
  };

  (Array.isArray(doc.content) ? doc.content : []).forEach((section, i) => walk(section, ['content', i], 1));
  if (count > profile.maxElements) {
    issues.push({ path: '', segments: [], message: `Máximo de ${profile.maxElements} elementos neste tipo de página.` });
  }
  return issues;
}
