import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ScrollExpandMedia } from './ScrollExpandMedia';

afterEach(() => {
  cleanup();
  window.scrollY = 0;
  window.location.hash = '';
});

describe('ScrollExpandMedia', () => {
  it('renders the media and the overlay content', () => {
    render(
      <ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>headline</h1>} />,
    );

    expect(screen.getByText('media')).toBeInTheDocument();
    expect(screen.getByText('headline')).toBeInTheDocument();
  });

  it('expands after a large wheel scroll', async () => {
    const { container } = render(<ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>h</h1>} />);
    const section = container.querySelector('section') as HTMLElement;

    expect(section).toHaveAttribute('data-expanded', 'false');

    fireEvent.wheel(window, { deltaY: 2000 });

    await waitFor(() => expect(section).toHaveAttribute('data-expanded', 'true'));
  });

  it('expands when the overlay calls expand()', async () => {
    const { container } = render(
      <ScrollExpandMedia
        media={<div>media</div>}
        overlay={({ expand }) => (
          <button type="button" onClick={expand}>
            go
          </button>
        )}
      />,
    );
    const section = container.querySelector('section') as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(section).toHaveAttribute('data-expanded', 'true'));
  });

  it('starts expanded when the page is already scrolled at mount', async () => {
    window.scrollY = 40;
    const { container } = render(<ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>h</h1>} />);
    const section = container.querySelector('section') as HTMLElement;

    await waitFor(() => expect(section).toHaveAttribute('data-expanded', 'true'));
  });
});
