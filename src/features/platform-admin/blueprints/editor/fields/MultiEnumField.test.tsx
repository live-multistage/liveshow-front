vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = () => false;
    return t;
  },
}));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiEnumField } from './MultiEnumField';

const SPEC = { kind: 'multiEnum', values: [], maxItems: 2, required: true, description: 'Campos' } as const;

describe('MultiEnumField', () => {
  it('MultiEnumField lists the entity\'s fields and respects maxItems', async () => {
    const onChange = vi.fn();
    render(<MultiEnumField id="f" spec={SPEC} value={['a']} optionKeys={['a', 'b', 'c']} onChange={onChange} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await userEvent.click(screen.getByRole('checkbox', { name: 'b' }));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'a' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('disables unchecked options once maxItems is reached', () => {
    render(<MultiEnumField id="f" spec={SPEC} value={['a', 'b']} optionKeys={['a', 'b', 'c']} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'c' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'a' })).toBeEnabled();
  });

  it('falls back to spec.values without optionKeys', () => {
    render(<MultiEnumField id="f" spec={{ ...SPEC, values: ['x', 'y'] }} value={[]} onChange={vi.fn()} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });
});
