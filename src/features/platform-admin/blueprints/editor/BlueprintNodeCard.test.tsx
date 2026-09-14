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

const forEachEntry: BlueprintCatalogEntry = {
  kind: 'core', key: 'core.forEach', version: 1, label: 'Para cada', description: '',
  config: { items: { kind: 'ref', type: { list: 'json' }, required: true, description: '' } }, outputs: {},
};

const switchEntry: BlueprintCatalogEntry = {
  kind: 'core', key: 'core.switch', version: 1, label: 'Escolher', description: '', dynamicPorts: 'switch',
  config: { value: { kind: 'ref', type: 'string', required: true, description: '' }, cases: { kind: 'cases', maxCases: 12, required: true, description: '' } },
  outputs: {},
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

  it('renders each/done handles with labels for core.forEach, keeping the fixed (non-stacked) card', () => {
    const container = renderCard(forEachEntry);
    const each = container.querySelector('[data-handleid="each"]');
    const done = container.querySelector('[data-handleid="done"]');
    expect(each).not.toBeNull();
    expect(done).not.toBeNull();
    expect((each as HTMLElement).style.getPropertyValue('--port-index')).toBe('0');
    expect((done as HTMLElement).style.getPropertyValue('--port-index')).toBe('1');
    expect(container.textContent).toContain('editor.ports.each');
    expect(container.textContent).toContain('editor.ports.done');
    const card = container.querySelector('[style*="--card-ports"]') as HTMLElement;
    expect(card.className).not.toMatch(/stacked/);
  });

  it('renders one handle per case plus default, indexed 0..n, and switches the card to stacked, for core.switch', () => {
    const container = renderCard(switchEntry, { config: { cases: [
      { match: 'PUBLISHED', port: 'a' }, { match: 'DRAFT', port: 'b' }, { match: 'REVIEW', port: 'c' },
    ] } });
    ['a', 'b', 'c', 'default'].forEach((id, i) => {
      const handle = container.querySelector(`[data-handleid="${id}"]`) as HTMLElement;
      expect(handle).not.toBeNull();
      expect(handle.style.getPropertyValue('--port-index')).toBe(String(i));
    });
    const card = container.querySelector('[style*="--card-ports"]') as HTMLElement;
    expect(card.style.getPropertyValue('--card-ports')).toBe('4');
    expect(card.className).toMatch(/stacked/);
  });

  it('keeps a plain 2-port card (core.condition) out of the stacked geometry', () => {
    // jsdom doesn't lay out, so this checks the modifier class/CSS variables
    // feeding the SCSS geometry rather than a computed pixel height.
    const container = renderCard(conditionEntry);
    const card = container.querySelector('[style*="--card-ports"]') as HTMLElement;
    expect(card.className).not.toMatch(/stacked/);
    expect(card.style.getPropertyValue('--card-ports')).toBe('2');
    const trueHandle = container.querySelector('[data-handleid="true"]') as HTMLElement;
    const falseHandle = container.querySelector('[data-handleid="false"]') as HTMLElement;
    expect(trueHandle.className).toMatch(/portPos0/);
    expect(falseHandle.className).toMatch(/portPos1/);
  });
});
