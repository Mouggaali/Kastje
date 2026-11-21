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

describe('patronen en tweede kleur', () => {
  const piece = (color: string, extra: Partial<ClothingItem> = {}) => ({ id: color, color, ...extra }) as ClothingItem;

  it('één patroon met verder effen stukken is prima', () => {
    const h = harmonyScore([piece('navy', { pattern: 'gestreept', color2: 'wit' }), piece('denim'), piece('wit')]);
    expect(h.score).toBe(90);
    expect(h.reason).toBe('Rustig en tijdloos: alleen neutrale kleuren, met één patroon');
  });

  it('twee drukke patronen botsen', () => {
    const h = harmonyScore([piece('navy', { pattern: 'gestreept', color2: 'wit' }), piece('grijs', { pattern: 'geruit' })]);
    expect(h.score).toBe(65);
    expect(h.reason).toBe('Twee drukke patronen botsen');
  });

  it('de tweede kleur telt mee bij felle kleuren', () => {
    // Rood-wit gestreept shirt met een gele broek: rood en geel zijn allebei fel
    const h = harmonyScore([piece('wit', { color2: 'rood', pattern: 'gestreept' }), piece('geel')]);
    expect(h.reason).toBe('Twee felle kleuren botsen');
  });

  it('effen zonder waarde (oude gegevens) telt niet als patroon', () => {
    expect(harmonyScore([piece('navy'), piece('grijs', { pattern: 'effen' })]).score).toBe(90);
  });
});

describe('hueOf', () => {
  it('rekent tinten uit', () => {
    expect(Math.round(hueOf('#ff0000'))).toBe(0);
    expect(Math.round(hueOf('#00ff00'))).toBe(120);
    expect(Math.round(hueOf('#0000ff'))).toBe(240);
  });
});
