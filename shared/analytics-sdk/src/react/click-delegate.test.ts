import { describe, it, expect, vi } from 'vitest';
import { installClickDelegate } from './click-delegate';
describe('click delegate', () => {
  it('tracks nearest data-track with props', () => {
    document.body.innerHTML = `<button data-track="cta_clicked" data-track-props='{"place":"hero"}'><span id="in">x</span></button>`;
    const trackUntyped = vi.fn(); const off = installClickDelegate(document, { trackUntyped });
    document.getElementById('in')!.click();
    expect(trackUntyped).toHaveBeenCalledWith('cta_clicked', { place: 'hero' });
    off();
  });
  it('ignores invalid names and bad JSON props with a warning', () => {
    document.body.innerHTML = `<a data-track="Bad Name">x</a><b data-track="ok_name" data-track-props="{nope">y</b>`;
    const trackUntyped = vi.fn(); const warn = vi.fn();
    installClickDelegate(document, { trackUntyped }, warn);
    (document.querySelector('a') as HTMLElement).click();
    (document.querySelector('b') as HTMLElement).click();
    expect(trackUntyped).toHaveBeenCalledTimes(1);
    expect(trackUntyped).toHaveBeenCalledWith('ok_name', undefined);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
