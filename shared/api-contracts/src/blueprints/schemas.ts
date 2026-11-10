import { z } from 'zod';
import type { BlueprintCatalogEntry, BlueprintConfigField, BlueprintFieldType, BlueprintOutputField } from './types';

const nodeId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export const blueprintGraphSchema = z
  .object({
    schemaVersion: z.literal(1),
    nodes: z
      .array(
        z.object({
          id: nodeId,
          node: z.string().min(1).max(120),
          version: z.number().int().positive(),
          config: z.record(z.unknown()),
          position: z.object({ x: z.number(), y: z.number() }).optional(),
        }),
      )
      .min(1)
      .max(50),
    edges: z.array(z.object({ from: nodeId, to: nodeId, port: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/i).optional() })).max(200),
  })
  .superRefine((g, ctx) => {
    const ids = new Set<string>();
    for (const n of g.nodes) {
      if (ids.has(n.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate node id ${n.id}`, path: ['nodes'] });
      ids.add(n.id);
    }
    for (const e of g.edges) {
      if (!ids.has(e.from) || !ids.has(e.to)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `edge ${e.from}->${e.to} points to an unknown node`, path: ['edges'] });
    }
  });

export const createBlueprintSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
});

const scalarType = z.enum(['string', 'number', 'boolean', 'datetime', 'uuid', 'url', 'json']);

// Cast: with `strict: false` zod infers every key optional, which no longer matches the declared type.
export const blueprintFieldTypeSchema = z.lazy(() =>
  z.union([
    scalarType,
    z.object({ list: blueprintFieldTypeSchema }).strict(),
    z.object({ object: z.record(blueprintOutputFieldSchema) }).strict(),
  ]),
) as z.ZodType<BlueprintFieldType, z.ZodTypeDef, unknown>;

export const blueprintOutputFieldSchema = z.lazy(() =>
  z
    .object({
      type: blueprintFieldTypeSchema,
      class: z.enum(['PUBLIC', 'INTERNAL', 'PERSONAL']),
      description: z.string(),
      port: z.string().optional(),
    })
    .strict(),
) as z.ZodType<BlueprintOutputField, z.ZodTypeDef, unknown>;

const base = { required: z.boolean(), description: z.string() };

export const blueprintConfigFieldSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ref'), type: blueprintFieldTypeSchema, ...base }),
  z.object({ kind: z.literal('text'), template: z.boolean(), acceptsPersonal: z.boolean(), maxLength: z.number(), ...base }),
  z.object({ kind: z.literal('enum'), values: z.array(z.string()), ...base }),
  z.object({ kind: z.literal('multiEnum'), values: z.array(z.string()), maxItems: z.number().int().positive(), ...base }),
  z.object({ kind: z.literal('uuid'), ...base }),
  z.object({ kind: z.literal('datetimeExpr'), ...base }),
  z.object({ kind: z.literal('condition'), ...base }),
  z.object({ kind: z.literal('number'), min: z.number().optional(), max: z.number().optional(), ...base }),
  z.object({ kind: z.literal('boolean'), ...base }),
  z.object({ kind: z.literal('duration'), ...base }),
  z.object({ kind: z.literal('keyValueList'), template: z.boolean(), maxItems: z.number(), ...base }),
  z.object({ kind: z.literal('secret'), ...base }),
  z.object({ kind: z.literal('cases'), maxCases: z.number(), ...base }),
]);

export const blueprintOutputsByOptionSchema = z.object({
  configKey: z.string().min(1),
  options: z.record(z.record(blueprintOutputFieldSchema)),
});

export const blueprintCatalogEntrySchema = z.object({
  key: z.string().min(1),
  version: z.number().int().positive(),
  kind: z.enum(['trigger', 'data', 'action', 'core']),
  label: z.string(),
  description: z.string(),
  config: z.record(blueprintConfigFieldSchema),
  outputs: z.record(blueprintOutputFieldSchema),
  event: z.string().optional(),
  ports: z.array(z.string()).optional(),
  optionalPorts: z.array(z.string()).optional(),
  mode: z.enum(['dispatch', 'call']).optional(),
  secretFields: z.array(z.string()).optional(),
  dynamicPorts: z.literal('switch').optional(),
  dynamicOutputs: z.enum(['forEach', 'byOption']).optional(),
  outputsByOption: blueprintOutputsByOptionSchema.optional(),
  dedupeKeyDefaults: z.record(z.string().min(1)).optional(),
});
