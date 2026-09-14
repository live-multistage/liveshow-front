vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = (key: string) => !key.startsWith('editor.enum.NONE');
    return t;
  },
}));

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AvailableField } from '../useEditorGraph';
import { RefSelect } from './RefSelect';

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const FIELDS: AvailableField[] = [
  { nodeId: 'h', nodeLabel: 'Requisição HTTP', field: 'partner', path: [], depth: 0, out: { type: { object: { name: { type: 'string', class: 'PUBLIC', description: '' }, rawJson: { type: 'json', class: 'INTERNAL', description: '' } } }, class: 'PUBLIC', description: 'Parceiro' } },
  { nodeId: 'h', nodeLabel: 'Requisição HTTP', field: 'partner', path: ['name'], depth: 1, out: { type: 'string', class: 'PUBLIC', description: 'Nome' } },
  { nodeId: 'h', nodeLabel: 'Requisição HTTP', field: 'partner', path: ['rawJson'], depth: 1, out: { type: 'json', class: 'INTERNAL', description: 'JSON bruto' } },
  { nodeId: 'h', nodeLabel: 'Requisição HTTP', field: 'error', path: [], depth: 0, out: { type: { object: { code: { type: 'string', class: 'INTERNAL', description: '' } } }, class: 'INTERNAL', description: 'Erro', port: 'error' } },
  { nodeId: 'h', nodeLabel: 'Requisição HTTP', field: 'error', path: ['code'], depth: 1, out: { type: 'string', class: 'INTERNAL', description: 'Código', port: 'error' } },
];

// Rejects like a `ref` slot of type `string` would: only plain strings fit.
const rejectString = (out: AvailableField['out']) => (out.type === 'string' ? null : 'incompatible');

describe('RefSelect', () => {
  it('renders nested options indented by depth, with a type chip per row', async () => {
    render(<RefSelect id="r" value="" fields={FIELDS} reject={rejectString} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));

    const nameOption = screen.getByRole('option', { name: /partner\.name/ });
    expect(nameOption).not.toHaveAttribute('aria-disabled', 'true');
    expect(nameOption.innerHTML).toMatch(/optionDepth1/);
  });

  it('shows the JSON chip and disables a json field for a string ref slot', async () => {
    render(<RefSelect id="r" value="" fields={FIELDS} reject={rejectString} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));

    const jsonOption = screen.getByRole('option', { name: /partner\.rawJson/ });
    expect(jsonOption).toHaveAttribute('aria-disabled', 'true');
    expect(jsonOption).toHaveTextContent('JSON');
  });

  it('passes the leaf out to reject, not the parent object', async () => {
    const reject = vi.fn().mockReturnValue(null);
    render(<RefSelect id="r" value="" fields={FIELDS} reject={reject} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));

    expect(reject).toHaveBeenCalledWith(expect.objectContaining({ type: 'string', description: 'Nome' }));
  });

  it('renders port-scoped fields below the error-port sub-header', async () => {
    render(<RefSelect id="r" value="" fields={FIELDS} reject={rejectString} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('editor.fields.errorPortSection')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /error\.code/ })).toBeInTheDocument();
  });

  it('selects a nested path, emitting the dotted ref expression', async () => {
    const onChange = vi.fn();
    render(<RefSelect id="r" value="" fields={FIELDS} reject={rejectString} onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /partner\.name/ }));

    expect(onChange).toHaveBeenCalledWith('{{h.partner.name}}');
  });
});
