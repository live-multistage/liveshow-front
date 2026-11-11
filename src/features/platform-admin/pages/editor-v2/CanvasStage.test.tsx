import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasStage, fitScale } from './CanvasStage';

describe('fitScale', () => {
  it('shrinks a wider canvas to the pane and never enlarges one that fits', () => {
    expect(fitScale(640, 1280)).toBe(0.5);
    expect(fitScale(1600, 1280)).toBe(1);
    expect(fitScale(0, 1280)).toBe(1);
  });
});

describe('CanvasStage', () => {
  it('renders the page at the real breakpoint width', () => {
    render(<CanvasStage width={768} breakpoint="tablet" deviceLabel="Tablet" crumbs={null}><p>page</p></CanvasStage>);
    expect(screen.getByText('page').parentElement).toHaveStyle({ width: '768px' });
  });
});
