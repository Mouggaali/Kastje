import { describe, expect, it } from 'vitest';
import type { ClothingItem } from '../types';
import { colorBreakdown, costPerWear, mostWorn, sleepers, wearStats } from './stats';

const TODAY = '2026-11-21';
const longAgo = new Date('2026-01-01T12:00:00').getTime();

function item(id: string, extra: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id,
    name: id,
    category: 'shirt',
    color: 'zwart',
    warmth: 3,
    occasions: ['casual'],
    waterproof: false,
    hasPhoto: false,
    updatedAt: 0,
    createdAt: longAgo,
    ...extra,
  };
}

const items = [
  item('vaak', { price: 30 }),
  item('ooit', { color: 'rood', price: 90 }),
  item('nooit', { color: 'rood' }),
  item('nieuw', { createdAt: new Date('2026-11-18T12:00:00').getTime() }),
  item('weg', { archived: true }),
];

const wearLog = [
  { date: '2026-11-20', itemIds: ['vaak'] },
  { date: '2026-11-15', itemIds: ['vaak'] },
  { date: '2026-11-10', itemIds: ['vaak'] },
  { date: '2026-09-01', itemIds: ['ooit'] },
];

const stats = wearStats(items, wearLog);

describe('wearStats', () => {
  it('telt hoe vaak en wanneer het laatst', () => {
    const vaak = stats.find((s) => s.item.id === 'vaak')!;
    expect(vaak.count).toBe(3);
    expect(vaak.lastWorn).toBe('2026-11-20');
  });

  it('mostWorn zet de vaakst gedragen bovenaan en laat nooit-gedragen weg', () => {
    expect(mostWorn(stats).map((s) => s.item.id)).toEqual(['vaak', 'ooit']);
  });
});

describe('sleepers', () => {
  it('vindt stukken die 30+ dagen of nooit gedragen zijn, maar niet nieuwe of gearchiveerde', () => {
    expect(sleepers(stats, TODAY).map((s) => s.item.id)).toEqual(['nooit', 'ooit']);
  });
});

describe('colorBreakdown', () => {
  it('telt per kleur', () => {
    const breakdown = colorBreakdown(items);
    expect(breakdown[0]).toMatchObject({ count: 3 });
    expect(breakdown[0].color.id).toBe('zwart');
    expect(breakdown[1].color.id).toBe('rood');
  });
});

describe('costPerWear', () => {
  it('deelt de prijs door het aantal keer dragen', () => {
    const result = costPerWear(stats);
    expect(result.map((r) => [r.item.id, r.perWear])).toEqual([
      ['ooit', 90],
      ['vaak', 10],
    ]);
  });
});
