import { describe, expect, it } from 'vitest';
import { nearestColor, pickDominant, pickTopColorIds, type Rgb } from './detectColor';

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

describe('pickTopColorIds', () => {
  it('ziet twee kleuren bij een gestreept shirt', () => {
    // Navy en wit, ongeveer half om half (in verschillende tinten, zoals licht en schaduw)
    const stripes = pixels([[30, 45, 95], 300], [[40, 55, 105], 200], [[248, 247, 244], 350], [[235, 233, 228], 200]);
    expect(pickTopColorIds(stripes)).toEqual({ primary: 'wit', secondary: 'navy' });
  });

  it('ziet één kleur bij een effen stuk', () => {
    const plain = pixels([[200, 50, 50], 900], [[216, 210, 198], 100]); // 10% vloer telt niet
    expect(pickTopColorIds(plain)).toEqual({ primary: 'rood' });
  });

  it('kan tegen een lege foto', () => {
    expect(pickTopColorIds([])).toEqual({ primary: 'grijs' });
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
