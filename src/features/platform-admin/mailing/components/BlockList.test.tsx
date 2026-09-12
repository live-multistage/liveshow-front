vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BlockList } from './BlockList';

const fields = [
  { id: 'b1', type: 'heading' as const },
  { id: 'b2', type: 'text' as const },
];

function renderList(invalid: boolean[]) {
  return render(
    <DndProvider backend={HTML5Backend}>
      <BlockList
        fields={fields}
        invalid={invalid}
        selected={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onMove={vi.fn()}
        onRemove={vi.fn()}
      />
    </DndProvider>,
  );
}

describe('BlockList row validation state', () => {
  it('marks an invalid row select button with aria-invalid', () => {
    renderList([true, false]);
    const rows = screen.getAllByTestId('block-row');
    expect(rows[0].querySelector('[data-select]')).toHaveAttribute('aria-invalid', 'true');
    expect(rows[1].querySelector('[data-select]')).not.toHaveAttribute('aria-invalid');
  });
});
