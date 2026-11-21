import { describe, expect, it } from 'vitest';
import { nearestColor, pickDominant, type Rgb } from './detectColor';

/** Maakt RGBA-pixels: `count` keer dezelfde kleur. */
function pixels(...parts: [Rgb, number][]): number[] {
  return parts.flatMap(([[r, g, b], count]) => Array.from({ length: count }, () => [r, g, b, 255]).flat());
}

describe('nearestColor', () => {
  it('herkent duidelijke kleuren', () => {
    expect(nearestColor([220, 50, 50]).id).toBe('rood');
    expect(nearestColor([30, 45, 95]).id).toBe('navy');
    expect(nearestColor([250, 250, 248]).id).toBe('wit');
    expect(nearestColor([20, 20, 20]).id).toBe('zwart');
    expect(nearestColor([75, 105, 150]).id).toBe('denim');
    expect(nearestColor([240, 200, 30]).id).toBe('geel');
  });
});

describe('pickDominant', () => {
  it('kiest de kleur die het meest voorkomt', () => {
    const result = pickDominant(pixels([[200, 40, 40], 60], [[250, 250, 250], 40]));
    expect(result).toEqual([200, 40, 40]);
  });

  it('middelt binnen een kleurgroep', () => {
    const result = pickDominant(pixels([[200, 40, 40], 10], [[210, 50, 50], 10]));
    expect(result).toEqual([205, 45, 45]);
  });

  it('slaat doorzichtige pixels over', () => {
    const transparent = Array.from({ length: 100 }, () => [0, 0, 0, 0]).flat();
    const result = pickDominant([...transparent, ...pixels([[30, 45, 95], 5])]);
    expect(nearestColor(result).id).toBe('navy');
  });

  it('geeft grijs als er niets te zien is', () => {
    expect(pickDominant([])).toEqual([128, 128, 128]);
  });
});
