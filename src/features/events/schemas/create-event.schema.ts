import { z } from 'zod';

export const ticketSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(255),
    description: z.string().min(5, 'Mínimo 5 caracteres'),
    price: z.coerce.number().min(0, 'Preço não pode ser negativo'),
    liveView: z.boolean().default(false),
    replayView: z.boolean().default(false),
    cameraView: z.boolean().default(false),
    camerasLimit: z
      .preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z.coerce.number().int('Deve ser número inteiro').min(1, 'Mínimo 1 câmera').nullable(),
      )
      .optional(),
    allowedStageIds: z.array(z.string().uuid()).optional(),
  })
  .refine((d) => d.liveView || d.replayView || d.cameraView, {
    message: 'Selecione ao menos um tipo de acesso',
    path: ['liveView'],
  });

export type TicketFormInput = z.input<typeof ticketSchema>;
export type TicketFormValues = z.output<typeof ticketSchema>;

export const EVENT_CATEGORY_VALUES = [
  'MUSIC', 'COMEDY', 'THEATER', 'DANCE', 'SPORTS',
  'TALK', 'RELIGIOUS', 'EDUCATION', 'OTHER',
] as const;

export const createEventSchema = z
  .object({
    organizationId: z.string().uuid('Selecione uma organização'),
    title: z.string().min(3, 'Mínimo 3 caracteres').max(255),
    description: z.string().min(10, 'Mínimo 10 caracteres'),
    category: z.enum(EVENT_CATEGORY_VALUES, {
      required_error: 'Selecione uma categoria',
      invalid_type_error: 'Selecione uma categoria',
    }),
    tags: z.array(z.string().min(1).max(80)).max(20).default([]),
    startsAt: z.string().min(1, 'Obrigatório'),
    endsAt: z.string().min(1, 'Obrigatório'),
    venue: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    camerasCount: z.coerce.number().int().min(1).max(32).default(1),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: 'Fim deve ser após o início',
    path: ['endsAt'],
  });

export type CreateEventFormValues = z.infer<typeof createEventSchema>;
