import { describe, expect, it } from 'vitest';
import type { ClothingItem } from '../types';
import { buyCheck } from './buyCheck';

function item(id: string, category: ClothingItem['category'], color: string, warmth: ClothingItem['warmth'] = 3): ClothingItem {
  return { id, name: id, category, color, warmth, occasions: ['casual'], waterproof: false, hasPhoto: false, updatedAt: 0 };
}

const closet = [
  item('Navy trui', 'trui', 'navy', 4),
  item('Wit shirt', 'shirt', 'wit', 1),
  item('Jeans', 'broek', 'denim'),
  item('Zwarte broek', 'broek', 'zwart'),
  item('Witte sneakers', 'schoenen', 'wit'),
  item('Bruine boots', 'schoenen', 'bruin', 4),
];

describe('buyCheck', () => {
  it('"Sla over" als je al iets vergelijkbaars hebt', () => {
    const result = buyCheck({ category: 'trui', color: 'navy', warmth: 4 }, closet);
    expect(result.verdict).toBe('skip');
    expect(result.similar.map((i) => i.name)).toEqual(['Navy trui']);
    expect(result.reason).toContain('navy trui');
  });

  it('een gestreepte trui is niet "hetzelfde" als een effen trui', () => {
    const result = buyCheck({ category: 'trui', color: 'navy', warmth: 4, pattern: 'gestreept' }, closet);
    expect(result.similar).toEqual([]);
    expect(result.verdict).not.toBe('skip');
  });

  it('"Koop het" als het nieuw is en met veel combineert', () => {
    const result = buyCheck({ category: 'shirt', color: 'bordeaux', warmth: 2 }, closet);
    expect(result.verdict).toBe('koop');
    expect(result.combinations).toBe(4); // 2 broeken × 2 paar schoenen
    expect(result.examples).toHaveLength(2);
  });

  it('"Twijfel" als er niets is om mee te combineren', () => {
    const onlyTops = closet.filter((i) => i.category === 'trui' || i.category === 'shirt');
    const result = buyCheck({ category: 'shirt', color: 'groen', warmth: 2 }, onlyTops);
    expect(result.verdict).toBe('twijfel');
    expect(result.combinations).toBe(0);
  });

  it('telt een felle kleur die botst niet als goede combinatie', () => {
    const bright = [item('Gele broek', 'broek', 'geel'), item('Sneakers', 'schoenen', 'wit')];
    const result = buyCheck({ category: 'shirt', color: 'rood', warmth: 1 }, bright);
    expect(result.combinations).toBe(0);
  });
});
