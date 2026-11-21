import { describe, expect, it } from 'vitest';
import type { ClothingItem } from '../types';
import { entryToOutfitIds, monthGrid } from './diary';

describe('monthGrid', () => {
  it('begint op maandag en vult de rest aan met lege vakjes', () => {
    // 1 november 2026 is een zondag
    const weeks = monthGrid(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[1][0]).toBe('2026-11-02'); // maandag
    expect(weeks.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('kent schrikkeljaren', () => {
    const days = (year: number) => monthGrid(year, 1).flat().filter(Boolean);
    expect(days(2028)).toHaveLength(29);
    expect(days(2027)).toHaveLength(28);
  });

  it('een maand die op maandag begint heeft geen lege vakjes vooraan', () => {
    expect(monthGrid(2026, 5)[0][0]).toBe('2026-06-01'); // 1 juni 2026 is een maandag
  });
});

describe('entryToOutfitIds', () => {
  const item = (id: string, category: ClothingItem['category']) =>
    ({ id, name: id, category, color: 'zwart', warmth: 3, occasions: ['casual'], waterproof: false, hasPhoto: false, updatedAt: 0 }) as ClothingItem;
  const items = [
    item('shirt', 'shirt'),
    item('trui', 'trui'),
    item('jeans', 'broek'),
    item('boots', 'schoenen'),
    item('jas', 'jas'),
    item('sjaal', 'accessoire'),
  ];

  it('verdeelt een gelogde dag over de onderdelen, met het shirt als laag onder de trui', () => {
    expect(entryToOutfitIds(['shirt', 'jeans', 'trui', 'boots', 'jas', 'sjaal'], items)).toEqual({
      top: 'trui',
      layer: 'shirt',
      bottom: 'jeans',
      shoes: 'boots',
      jacket: 'jas',
      accessories: ['sjaal'],
    });
  });

  it('alleen een shirt is gewoon het bovenstuk', () => {
    expect(entryToOutfitIds(['shirt', 'jeans'], items)).toEqual({ top: 'shirt', bottom: 'jeans' });
  });

  it('slaat stukken over die niet meer bestaan', () => {
    expect(entryToOutfitIds(['weg', 'jeans'], items)).toEqual({ bottom: 'jeans' });
  });
});
