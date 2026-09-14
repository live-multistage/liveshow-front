// Regression guard for the "malformed ICU" bug: `{{t.userId}}` etc. in the
// tour copy are literal braces, which ICU MessageFormat treats as
// significant unless quoted (`'{{'t.userId'}}'`). Every other test in this
// feature mocks next-intl's `useTranslations` as an identity function, so it
// can't catch this — this is the one test that runs the copy through the
// real `use-intl`/next-intl translator (no mock) against the real pt
// messages, the way the app actually renders it.
import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import pt from '../../../../../../shared/i18n-messages/pt.json';

describe('tour copy renders through real ICU (no next-intl mock)', () => {
  const t = createTranslator({ locale: 'pt', messages: pt, namespace: 'platformAdmin.blueprints' });

  it('step bodies with {{node.field}} refs render the literal braces, not the raw ICU', () => {
    expect(t('tour.steps.0.body')).toContain('{{t.userId}}');
    expect(t('tour.steps.1.body')).toContain('{{t.eventId}}');
    expect(t('tour.steps.3.body')).toContain('{{t.userId}}');
    expect(t('tour.steps.5.body')).toContain('{{t.eventId}}');
    expect(t('tour.steps.6.body')).toContain('{{s.saved}}');
    expect(t('tour.steps.7.body')).toContain('{{e.slug}}');
  });

  it('the completion "learned" bullet with a ref renders the literal braces', () => {
    expect(t('tour.completion.learned.1')).toContain('{{nó.campo}}');
  });
});
