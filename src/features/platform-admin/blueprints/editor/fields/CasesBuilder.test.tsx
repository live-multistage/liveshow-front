vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = () => false;
    return t;
  },
}));

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintSwitchCase } from '@live-show/api-contracts';
import { CasesBuilder } from './CasesBuilder';

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

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

  it('flags reserved port names that would collide with fixed handles (true/error), not just "default"', () => {
    const reserved: BlueprintSwitchCase[] = [
      { match: 'a', port: 'true' },
      { match: 'b', port: 'error' },
    ];
    render(<CasesBuilder id="c" label="Casos" value={reserved} maxCases={12} onChange={vi.fn()} />);
    expect(screen.getAllByText('editor.fields.cases.errReserved')).toHaveLength(2);
  });

  it('flags an empty value and an invalid port pattern', () => {
    const invalid: BlueprintSwitchCase[] = [{ match: '', port: '!!' }];
    render(<CasesBuilder id="c" label="Casos" value={invalid} maxCases={12} onChange={vi.fn()} />);

    expect(screen.getByText('editor.fields.cases.errValue')).toBeInTheDocument();
  });

  it('keeps an unparsable case (e.g. legacy null match) on the raw array and preserves it when a sibling row is edited', () => {
    const onChange = vi.fn();
    const withLegacy = [{ match: null, port: 'legacy' }, { match: 'A', port: 'a' }];
    render(<CasesBuilder id="c" label="Casos" value={withLegacy} maxCases={12} onChange={onChange} />);

    // The legacy row still renders (empty value, existing empty-value error) instead of vanishing.
    expect(screen.getAllByText('editor.fields.cases.errValue')).toHaveLength(1);
    expect(screen.getByDisplayValue('legacy')).toBeInTheDocument();

    const portInputs = screen.getAllByLabelText('editor.fields.cases.port');
    fireEvent.change(portInputs[1], { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith([{ match: null, port: 'legacy' }, { match: 'A', port: 'b' }]);
  });
});

describe('CasesBuilder — typed value (matchesCase compares strictly typed)', () => {
  it('numeric valueType: typing a number stores it as a number', () => {
    const onChange = vi.fn();
    const numeric: BlueprintSwitchCase[] = [{ match: 0, port: 'small' }];
    render(<CasesBuilder id="c" label="Casos" value={numeric} maxCases={12} valueType="number" onChange={onChange} />);

    // 0 is a valid match, not "empty" — no errValue for it.
    expect(screen.queryByText('editor.fields.cases.errValue')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();

    const valueInput = screen.getByLabelText('editor.fields.cases.value');
    fireEvent.change(valueInput, { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith([{ match: 12, port: 'small' }]);
  });

  it('numeric valueType: a non-numeric value keeps the raw string and shows errNumber', () => {
    const onChange = vi.fn();
    const numeric: BlueprintSwitchCase[] = [{ match: 'abc', port: 'small' }];
    render(<CasesBuilder id="c" label="Casos" value={numeric} maxCases={12} valueType="number" onChange={onChange} />);

    expect(screen.getByText('editor.fields.cases.errNumber')).toBeInTheDocument();

    const valueInput = screen.getByLabelText('editor.fields.cases.value');
    fireEvent.change(valueInput, { target: { value: 'still-abc' } });
    expect(onChange).toHaveBeenCalledWith([{ match: 'still-abc', port: 'small' }]);
  });

  it('boolean valueType: renders a select and emits a real boolean', async () => {
    const onChange = vi.fn();
    const boolCase: BlueprintSwitchCase[] = [{ match: false, port: 'small' }];
    render(<CasesBuilder id="c" label="Casos" value={boolCase} maxCases={12} valueType="boolean" onChange={onChange} />);

    // false is a valid match, not "empty".
    expect(screen.queryByText('editor.fields.cases.errValue')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'editor.fields.cases.true' }));
    expect(onChange).toHaveBeenCalledWith([{ match: true, port: 'small' }]);
  });
});
