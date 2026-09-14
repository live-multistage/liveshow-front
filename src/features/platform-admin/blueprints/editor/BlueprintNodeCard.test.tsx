vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.has = () => true;
    return t;
  },
}));

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlow } from '@xyflow/react';
import type { BlueprintCatalogEntry } from '@live-show/api-contracts';
import { BlueprintNodeCard, type CardData, type CardNode } from './BlueprintNodeCard';
import type { EditorNode } from './useEditorGraph';

const nodeTypes = { blueprint: BlueprintNodeCard };

function renderCard(entry: BlueprintCatalogEntry, instance: Partial<EditorNode> = {}, extra: Partial<CardData> = {}) {
  const node: CardNode = {
    id: 'n1',
    type: 'blueprint',
    position: { x: 0, y: 0 },
    data: {
      instance: { id: 'n1', node: entry.key, version: entry.version, config: {}, position: { x: 0, y: 0 }, ...instance },
      entry,
      errorCount: 0,
      ...extra,
    },
  };
  const { container } = render(
    <div style={{ width: 800, height: 600 }}>
      <ReactFlow nodeTypes={nodeTypes} nodes={[node]} edges={[]} />
    </div>,
  );
  return container;
}

const httpEntry: BlueprintCatalogEntry = {
  kind: 'action', key: 'http.request', version: 1, mode: 'call', label: 'HTTP', description: '', secretFields: ['url'],
  ports: ['next', 'error'], optionalPorts: ['error'], config: {}, outputs: {},
};

const conditionEntry: BlueprintCatalogEntry = {
  kind: 'core', key: 'core.condition', version: 1, label: 'Condição', description: '', config: {}, outputs: {}, ports: ['true', 'false'],
};

const delayEntry: BlueprintCatalogEntry = {
  kind: 'core', key: 'core.delay', version: 1, label: 'Aguardar', description: '', config: {}, outputs: {},
};

describe('BlueprintNodeCard', () => {
  it('renders a source handle per declared port, incl. next/error', () => {
    const container = renderCard(httpEntry);
    const next = container.querySelector('[data-handleid="next"]');
    const error = container.querySelector('[data-handleid="error"]');
    expect(next).not.toBeNull();
    expect(error).not.toBeNull();
    expect(error?.getAttribute('data-handlepos')).toBe('bottom');
  });

  it('the error port is unconnected (50% opacity class) until an edge leaves it', () => {
    const container = renderCard(httpEntry, {}, { errorConnected: false });
    const error = container.querySelector('[data-handleid="error"]');
    expect(error?.className).toMatch(/portError/);
    expect(error?.className).not.toMatch(/portErrorConnected/);
  });

  it('marks the error port connected once an edge leaves it', () => {
    const container = renderCard(httpEntry, {}, { errorConnected: true });
    const error = container.querySelector('[data-handleid="error"]');
    expect(error?.className).toMatch(/portErrorConnected/);
  });

  it('still renders true/false handles for core.condition', () => {
    const container = renderCard(conditionEntry);
    expect(container.querySelector('[data-handleid="true"]')).not.toBeNull();
    expect(container.querySelector('[data-handleid="false"]')).not.toBeNull();
    expect(container.querySelector('[data-handleid="error"]')).toBeNull();
  });

  it('shows the duration sub-line for core.delay', () => {
    const container = renderCard(delayEntry, { config: { duration: '2h' } }, { sub: '2h' });
    expect(container.textContent).toContain('2h');
  });
});
