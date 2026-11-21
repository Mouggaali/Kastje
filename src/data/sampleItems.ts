import type { ClothingItem } from '../types';

// Drie voorbeeldstukken, zodat je bij de eerste keer openen direct iets ziet.
export const sampleItems: ClothingItem[] = [
  {
    id: 'voorbeeld-trui',
    name: 'Grijze wollen trui',
    category: 'trui',
    color: 'grijs',
    warmth: 4,
    waterproof: false,
    hasPhoto: false,
    occasions: ['casual', 'werk'],
    updatedAt: 0,
  },
  {
    id: 'voorbeeld-jeans',
    name: 'Blauwe jeans',
    category: 'broek',
    color: 'denim',
    warmth: 3,
    waterproof: false,
    hasPhoto: false,
    occasions: ['casual', 'werk'],
    updatedAt: 0,
  },
  {
    id: 'voorbeeld-sneakers',
    name: 'Witte sneakers',
    category: 'schoenen',
    color: 'wit',
    warmth: 2,
    waterproof: false,
    hasPhoto: false,
    occasions: ['casual', 'werk'],
    updatedAt: 0,
  },
];
