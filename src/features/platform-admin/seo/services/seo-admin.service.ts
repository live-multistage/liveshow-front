import { httpClient } from '@/lib/http/client';
import type { SeoFields, SeoGlobal, SeoPageKey, SeoPageTemplate, SeoPathOverride } from '@live-show/api-contracts';

// The API rejects unknown body keys (forbidNonWhitelisted), so bodies are built from explicit key lists.
function pickFields(f: SeoFields): SeoFields {
  return {
    titleTemplate: f.titleTemplate,
    descriptionTemplate: f.descriptionTemplate,
    ogImageUrl: f.ogImageUrl,
    robotsIndex: f.robotsIndex,
    robotsFollow: f.robotsFollow,
    disabledGeneratedJsonLd: f.disabledGeneratedJsonLd,
    extraJsonLd: f.extraJsonLd,
  };
}

function pickGlobal(g: SeoGlobal): SeoGlobal {
  return {
    googleSiteVerification: g.googleSiteVerification,
    bingSiteVerification: g.bingSiteVerification,
    defaultOgImageUrl: g.defaultOgImageUrl,
    organizationJsonLd: g.organizationJsonLd,
    websiteJsonLd: g.websiteJsonLd,
    robotsExtraRules: g.robotsExtraRules,
  };
}

export type SeoOverrideInput = SeoFields & { path: string };

const overrideBody = (o: SeoOverrideInput) => ({ path: o.path, ...pickFields(o) });

export const seoAdminService = {
  listTemplates: async (): Promise<SeoPageTemplate[]> =>
    (await httpClient.get<SeoPageTemplate[]>('/platform/seo/templates')).data,

  setTemplate: async (pageKey: SeoPageKey, fields: SeoFields): Promise<SeoPageTemplate> =>
    (await httpClient.put<SeoPageTemplate>(`/platform/seo/templates/${pageKey}`, pickFields(fields))).data,

  listOverrides: async (): Promise<SeoPathOverride[]> =>
    (await httpClient.get<SeoPathOverride[]>('/platform/seo/overrides')).data,

  createOverride: async (input: SeoOverrideInput): Promise<SeoPathOverride> =>
    (await httpClient.post<SeoPathOverride>('/platform/seo/overrides', overrideBody(input))).data,

  updateOverride: async (id: string, input: SeoOverrideInput): Promise<SeoPathOverride> =>
    (await httpClient.put<SeoPathOverride>(`/platform/seo/overrides/${id}`, overrideBody(input))).data,

  deleteOverride: async (id: string): Promise<void> => {
    await httpClient.delete(`/platform/seo/overrides/${id}`);
  },

  getGlobal: async (): Promise<SeoGlobal> => (await httpClient.get<SeoGlobal>('/platform/seo/global')).data,

  setGlobal: async (global: SeoGlobal): Promise<SeoGlobal> =>
    (await httpClient.put<SeoGlobal>('/platform/seo/global', pickGlobal(global))).data,
};
