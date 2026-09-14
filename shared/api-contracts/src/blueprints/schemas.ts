import { z } from 'zod';

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
