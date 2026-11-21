import { describe, expect, it } from 'vitest';
import type { ClothingItem } from '../types';
import { harmonyScore, hueOf } from './harmony';

const withColors = (...colors: string[]) =>
  colors.map((color, i) => ({ id: String(i), color }) as ClothingItem);

describe('harmonyScore', () => {
  it('alleen neutraal is rustig en goed', () => {
    const h = harmonyScore(withColors('zwart', 'wit', 'denim'));
    expect(h.score).toBe(90);
    expect(h.reason).toMatch(/neutrale/);
  });

  it('neutraal met één accent scoort het best', () => {
    const h = harmonyScore(withColors('navy', 'beige', 'rood'));
    expect(h.score).toBe(96);
    expect(h.label).toBe('Sterk');
    expect(h.reason).toBe('Neutraal met één accent');
  });

  it('tint-op-tint is goed', () => {
    expect(harmonyScore(withColors('blauw', 'paars', 'wit')).reason).toBe('Tint-op-tint');
  });

  it('twee felle kleuren botsen', () => {
    const h = harmonyScore(withColors('rood', 'geel', 'zwart'));
    expect(h.score).toBeLessThan(65);
    expect(h.label).toBe('Gewaagd');
    expect(h.reason).toBe('Twee felle kleuren botsen');
  });

  it('botsende tinten scoren lager dan complementair', () => {
    const clash = harmonyScore(withColors('blauw', 'groen')).score; // ~90° uit elkaar
    const complement = harmonyScore(withColors('blauw', 'oranje')).score; // tegenover elkaar
    expect(complement).toBeGreaterThan(clash);
  });
});

describe('hueOf', () => {
  it('rekent tinten uit', () => {
    expect(Math.round(hueOf('#ff0000'))).toBe(0);
    expect(Math.round(hueOf('#00ff00'))).toBe(120);
    expect(Math.round(hueOf('#0000ff'))).toBe(240);
  });
});
