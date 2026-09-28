import { describe, it, expect } from 'vitest';
import { ActiveTimer } from './feature-timer';
describe('ActiveTimer', () => {
  it('counts running time, excludes paused time', () => {
    let t = 0; const timer = new ActiveTimer(() => t);
    timer.start(); t = 1000; timer.pause(); t = 5000; timer.start(); t = 6000;
    expect(timer.elapsed()).toBe(2000);
  });
  it('stops counting after idle threshold until activity', () => {
    let t = 0; const timer = new ActiveTimer(() => t, 60_000);
    timer.start(); t = 90_000;                 // idle since 0 → counts only 60s
    expect(timer.elapsed()).toBe(60_000);
    timer.activity(); t = 100_000;             // resumes at 90s
    expect(timer.elapsed()).toBe(70_000);
  });
});
