import { describe, expect, it } from 'vitest';
import { normalizeItem } from './storage';

describe('normalizeItem', () => {
  it('laat kleding uit een oudere versie gewoon werken', () => {
    const old = {
      id: 'oud',
      name: 'Oude trui',
      category: 'trui' as const,
      color: 'grijs',
      warmth: 4 as const,
      waterproof: false,
      hasPhoto: true,
      updatedAt: 1,
    };
    const item = normalizeItem(old as never);
    expect(item.occasions).toEqual(['casual']);
    expect(item.name).toBe('Oude trui');
    expect(item.hasPhoto).toBe(true);
    expect(item.archived).toBeUndefined();
  });

  it('houdt gekozen gelegenheden en prijs', () => {
    const item = normalizeItem({ id: 'x', occasions: ['werk', 'feest'], price: 49.95 });
    expect(item.occasions).toEqual(['werk', 'feest']);
    expect(item.price).toBe(49.95);
  });
});
