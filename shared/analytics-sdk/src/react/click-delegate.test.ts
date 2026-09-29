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
  it('ignores data-track-props that parse to a non-plain-object', () => {
    document.body.innerHTML = `<button data-track="ok_name" data-track-props='[1,2,3]'>x</button>`;
    const trackUntyped = vi.fn(); const warn = vi.fn();
    const off = installClickDelegate(document, { trackUntyped }, warn);
    document.querySelector('button')!.click();
    expect(trackUntyped).toHaveBeenCalledWith('ok_name', undefined);
    expect(warn).toHaveBeenCalledTimes(1);
    off();
  });
  it('does not throw when process is undefined (no explicit onWarn)', () => {
    const original = globalThis.process;
    // Cast to an optional property so `delete` type-checks regardless of
    // whether the consuming tsconfig pulls in @types/node (it varies between
    // this package and apps that vendor it, so a plain @ts-expect-error is
    // "unused" in one of them).
    delete (globalThis as { process?: unknown }).process;
    try {
      document.body.innerHTML = `<button data-track="Bad Name">x</button>`;
      const trackUntyped = vi.fn();
      const off = installClickDelegate(document, { trackUntyped });
      expect(() => document.querySelector('button')!.click()).not.toThrow();
      off();
    } finally {
      globalThis.process = original;
    }
  });
});
