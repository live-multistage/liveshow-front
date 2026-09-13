vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/features/channels', () => ({ useChannelsQuery: () => ({ data: [] }) }));

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudienceParamField } from './AudienceParamField';
import type { MailingAudience, MailingAudienceParamSpec } from '@live-show/api-contracts';

const spec: MailingAudienceParamSpec = { kind: 'int', min: 1, max: 365, default: 24 };
const value: MailingAudience = { type: 'ABANDONED_CARTS', olderThanHours: 24 };

describe('AudienceParamField (int kind)', () => {
  it('does not snap to spec.min while the field is being cleared and retyped', () => {
    const onChange = vi.fn();
    render(
      <AudienceParamField paramKey="olderThanHours" spec={spec} value={value} onChange={onChange} id="field" />,
    );
    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '4' } });
    expect(input.value).toBe('4');
    expect(onChange).toHaveBeenLastCalledWith({ type: 'ABANDONED_CARTS', olderThanHours: 4 });
  });

  it('resets to the last valid value on blur when left empty', () => {
    const onChange = vi.fn();
    render(
      <AudienceParamField paramKey="olderThanHours" spec={spec} value={value} onChange={onChange} id="field" />,
    );
    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input.value).toBe('24');
  });
});
