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
import type { BlueprintSwitchCase } from '@live-show/api-contracts';
import { CasesBuilder } from './CasesBuilder';

const CASES: BlueprintSwitchCase[] = [
  { match: 'published', port: 'published' },
  { match: 'draft', port: 'draft' },
];

describe('CasesBuilder', () => {
  it('renders one row per case plus the fixed "todos os outros" row', () => {
    render(<CasesBuilder id="c" label="Casos" value={CASES} maxCases={12} onChange={vi.fn()} />);

    expect(screen.getAllByDisplayValue('published')).toHaveLength(2);
    expect(screen.getAllByDisplayValue('draft')).toHaveLength(2);
    expect(screen.getByText('editor.fields.cases.otherwise')).toBeInTheDocument();
    expect(screen.getByText('editor.fields.cases.default')).toBeInTheDocument();
  });

  it('adds a new empty case on "+ Adicionar caso"', async () => {
    const onChange = vi.fn();
    render(<CasesBuilder id="c" label="Casos" value={CASES} maxCases={12} onChange={onChange} />);

    await userEvent.click(screen.getByText('editor.fields.cases.add'));
    expect(onChange).toHaveBeenCalledWith([...CASES, { match: '', port: '' }]);
  });

  it('removes a row on its X button', async () => {
    const onChange = vi.fn();
    render(<CasesBuilder id="c" label="Casos" value={CASES} maxCases={12} onChange={onChange} />);

    await userEvent.click(screen.getAllByLabelText('editor.fields.removeRow')[0]);
    expect(onChange).toHaveBeenCalledWith([CASES[1]]);
  });

  it('flags a duplicate port with the reserved/duplicate messages and disables add at the limit', () => {
    const dup: BlueprintSwitchCase[] = [
      { match: 'grande', port: 'default' },
      { match: '100', port: 'small' },
      { match: '500', port: 'small' },
    ];
    render(<CasesBuilder id="c" label="Casos" value={dup} maxCases={3} onChange={vi.fn()} />);

    expect(screen.getByText('editor.fields.cases.errReserved')).toBeInTheDocument();
    const duplicateMsgs = screen.getAllByText('editor.fields.cases.errDuplicate');
    expect(duplicateMsgs).toHaveLength(2);

    const addBtn = screen.getByRole('button', { name: /editor\.fields\.cases\.add/ });
    expect(addBtn).toBeDisabled();
    expect(addBtn).toHaveTextContent('editor.fields.cases.limit:{"max":3}');
  });

  it('flags an empty value and an invalid port pattern', () => {
    const invalid: BlueprintSwitchCase[] = [{ match: '', port: '!!' }];
    render(<CasesBuilder id="c" label="Casos" value={invalid} maxCases={12} onChange={vi.fn()} />);

    expect(screen.getByText('editor.fields.cases.errValue')).toBeInTheDocument();
  });
});
