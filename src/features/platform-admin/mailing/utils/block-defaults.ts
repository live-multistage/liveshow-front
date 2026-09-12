import type { MailingBlock, MailingBlockType, MailingTemplateDraft } from '@live-show/api-contracts';

export const BLOCK_TYPES: MailingBlockType[] = ['heading', 'text', 'image', 'button', 'eventCard', 'eventList', 'divider'];

export const EMPTY_DRAFT: MailingTemplateDraft = {
  name: '', category: 'MARKETING', subject: '', preheader: '', language: 'pt', blocks: [],
};

// Deliberately incomplete where the admin must choose (image, events): the
// zod schema flags them, the preview says "fix the highlighted fields".
export function newBlock(type: MailingBlockType): MailingBlock {
  switch (type) {
    case 'heading': return { type, text: 'Olá, {{nome}}', size: 'lg' };
    case 'text': return { type, paragraphs: [[{ text: 'Escreva aqui.' }]] };
    case 'image': return { type, assetKey: '', alt: '' };
    case 'button': return { type, label: 'Saiba mais', href: 'https://showon.io' };
    case 'eventCard': return { type, eventId: '' };
    case 'eventList': return { type, eventIds: [] };
    case 'divider': return { type };
  }
}
