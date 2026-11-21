import { describe, expect, it } from 'vitest';
import type { ClothingItem, DayWeather } from '../types';
import { packingList } from './packing';

function item(id: string, category: ClothingItem['category'], warmth: ClothingItem['warmth'], extra: Partial<ClothingItem> = {}): ClothingItem {
  return { id, name: id, category, warmth, color: 'zwart', occasions: ['casual'], waterproof: false, hasPhoto: false, updatedAt: 0, ...extra };
}

function day(date: string, feelsLike: number, rainChance = 0): DayWeather {
  return { date, feelsLike, feelsLikeMin: feelsLike, feelsLikeMax: feelsLike, rainChance, windSpeed: 10, weatherCode: 3 };
}

const closet = [
  item('t-shirt', 'shirt', 1),
  item('linnen hemd', 'shirt', 2),
  item('trui', 'trui', 4),
  item('short', 'broek', 1),
  item('jeans', 'broek', 3),
  item('sneakers', 'schoenen', 2),
  item('regenjas', 'jas', 3, { waterproof: true }),
  item('sjaal', 'accessoire', 3, { accessoryType: 'sjaal' }),
];

describe('packingList', () => {
  it('neemt dezelfde stukken bij vergelijkbaar weer, zodat de koffer klein blijft', () => {
    const result = packingList(closet, [day('2026-12-01', 25), day('2026-12-02', 26), day('2026-12-03', 24)]);
    expect(result.count).toBe(3); // t-shirt, short, sneakers
    const shirt = result.groups.find((g) => g.category === 'shirt')!.entries[0];
    expect(shirt.item.id).toBe('t-shirt');
    expect(shirt.dates).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']);
  });

  it('voegt warme kleding en accessoires toe voor een koude dag', () => {
    const result = packingList(closet, [day('2026-12-01', 25), day('2026-12-02', 3, 70)]);
    const ids = result.groups.flatMap((g) => g.entries.map((e) => e.item.id));
    expect(ids).toEqual(expect.arrayContaining(['t-shirt', 'trui', 'jeans', 'regenjas', 'sjaal']));
    expect(result.days[1].outfit.jacket?.id).toBe('regenjas');
  });

  it('groepeert in de vaste volgorde van de kast', () => {
    const result = packingList(closet, [day('2026-12-02', 3, 70)]);
    expect(result.groups.map((g) => g.category)).toEqual(['shirt', 'trui', 'jas', 'broek', 'schoenen', 'accessoire']);
  });
});
