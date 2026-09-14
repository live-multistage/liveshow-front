vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.has = () => true;
    return t;
  },
  useLocale: () => 'pt-BR',
}));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CATALOG_MAP } from './__fixtures__/catalog';
import { Canvas } from './Canvas';
import type { EditorState } from './useEditorGraph';

function renderCanvas(state: EditorState, minimapPosition?: 'bottom-left' | 'bottom-right') {
  return render(
    <div style={{ width: 800, height: 600 }}>
      <ReactFlowProvider>
        <Canvas
          state={state}
          dispatch={vi.fn()}
          catalog={CATALOG_MAP}
          errorCounts={new Map()}
          readOnly={false}
          focus={null}
          minimapPosition={minimapPosition}
        />
      </ReactFlowProvider>
    </div>,
  );
}

const baseState = (config: Record<string, unknown>): EditorState => ({
  nodes: [
    { id: 't', node: 'events.published', version: 1, config: {}, position: { x: 0, y: 0 } },
    { id: 'f', node: 'core.forEach', version: 1, config, position: { x: 300, y: 0 } },
    { id: 'end', node: 'core.end', version: 1, config: {}, position: { x: 600, y: 0 } },
  ],
  edges: [{ from: 't', to: 'f' }, { from: 'f', to: 'end', port: 'each' }],
  selectedId: null,
  revision: 0,
  savedRevision: 0,
  loadId: 0,
});

describe('Canvas', () => {
  it('translates the each/done/default/case port names into edge labels', () => {
    renderCanvas(baseState({ items: '{{s.followers}}' }));
    expect(screen.getByText('editor.ports.each')).toBeInTheDocument();
  });

  it('shows the picked items ref on core.forEach\'s sub-line', () => {
    renderCanvas(baseState({ items: '{{s.followers}}' }));
    expect(screen.getByText('s.followers')).toBeInTheDocument();
  });

  it('falls back to the grey "select a list" hint when core.forEach has no items ref', () => {
    renderCanvas(baseState({}));
    expect(screen.getByText('editor.fields.selectList')).toBeInTheDocument();
  });

  // Guided tour (design §A): the panel is anchored bottom-right, so it must
  // be able to push the minimap out of its way.
  it('defaults the minimap to bottom-right, and flips to bottom-left when asked', () => {
    const { container, unmount } = renderCanvas(baseState({}));
    expect(container.querySelector('.react-flow__minimap')).toHaveClass('bottom', 'right');
    unmount();

    const { container: container2 } = renderCanvas(baseState({}), 'bottom-left');
    expect(container2.querySelector('.react-flow__minimap')).toHaveClass('bottom', 'left');
  });
});
