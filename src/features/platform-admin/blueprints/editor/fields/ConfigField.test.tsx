vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = () => false;
    return t;
  },
}));

const secretsData = vi.fn();
vi.mock('../../queries/blueprint-secrets.queries', () => ({
  useBlueprintSecretsQuery: () => secretsData(),
}));

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintCatalogEntry, BlueprintConfigField } from '@live-show/api-contracts';
import type { AvailableField } from '../useEditorGraph';
import { ConfigField } from './ConfigField';

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  secretsData.mockReturnValue({ data: [] });
});

const ENTRY: BlueprintCatalogEntry = {
  key: 'test.http', version: 1, kind: 'action', mode: 'call', label: 'HTTP', description: 'Chama um endpoint externo.',
  secretFields: ['headers'],
  config: {}, outputs: {},
};

const FIELDS: AvailableField[] = [
  { nodeId: 'h', nodeLabel: 'Requisição HTTP', field: 'orderId', path: [], depth: 0, out: { type: 'string', class: 'PUBLIC', description: 'Pedido' } },
];

function renderField(name: string, spec: BlueprintConfigField, value: unknown, onChange = vi.fn()) {
  render(<ConfigField nodeId="h" entry={ENTRY} name={name} spec={spec} value={value} fields={FIELDS} onChange={onChange} />);
  return onChange;
}

describe('ConfigField — number', () => {
  it('renders a numeric input with min/max and emits numbers', async () => {
    const onChange = renderField('timeoutMs', { kind: 'number', required: false, description: 'Timeout', min: 100, max: 10000 }, 5000);
    const input = screen.getByLabelText('Timeout') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '100');
    expect(input).toHaveAttribute('max', '10000');
    fireEvent.change(input, { target: { value: '250' } });
    expect(onChange).toHaveBeenLastCalledWith(250);
  });
});

describe('ConfigField — boolean', () => {
  it('toggles the switch', async () => {
    const onChange = renderField('followRedirects', { kind: 'boolean', required: false, description: 'Seguir redirects' }, true);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('ConfigField — duration', () => {
  it('shows the parsed amount/unit and emits a new duration when the unit changes', async () => {
    const onChange = renderField('retentionWindow', { kind: 'duration', required: false, description: 'Janela' }, '2h');
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
    expect(screen.getByRole('combobox')).toHaveTextContent('editor.fields.durationUnit.h');

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'editor.fields.durationUnit.d' }));
    expect(onChange).toHaveBeenCalledWith('2d');
  });
});

describe('ConfigField — keyValueList', () => {
  it('adds a row and emits it, and lists secrets when the entry allows it', async () => {
    secretsData.mockReturnValue({ data: [{ name: 'PARTNER', updatedAt: '2026-01-01T00:00:00Z' }] });
    const onChange = renderField('headers', { kind: 'keyValueList', required: false, description: 'Cabeçalhos', template: true, maxItems: 5 }, []);

    await userEvent.click(screen.getByText('editor.fields.addHeader'));
    expect(onChange).toHaveBeenCalledWith([{ name: '', value: '' }]);
  });

  it('renders existing rows and offers secrets.NAME from the query', async () => {
    secretsData.mockReturnValue({ data: [{ name: 'PARTNER', updatedAt: '2026-01-01T00:00:00Z' }] });
    renderField(
      'headers',
      { kind: 'keyValueList', required: false, description: 'Cabeçalhos', template: true, maxItems: 5 },
      [{ name: 'Authorization', value: '' }],
    );

    const addVariable = screen.getByText('editor.fields.addVariable');
    await userEvent.click(addVariable);
    expect(screen.getByText('secrets.PARTNER')).toBeInTheDocument();
  });
});

describe('ConfigField — secret', () => {
  it('lists secret names from the mocked query', async () => {
    secretsData.mockReturnValue({ data: [{ name: 'PARTNER', updatedAt: '2026-01-01T00:00:00Z' }] });
    renderField('secret', { kind: 'secret', required: false, description: 'Segredo' }, '');

    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'PARTNER' })).toBeInTheDocument();
  });
});
