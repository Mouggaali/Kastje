// Kleuren in drie soorten:
// - neutraal: past bij alles
// - fel: maximaal één per outfit
// - gewoon: rustige kleuren die je vrij kunt combineren

export type ColorKind = 'neutraal' | 'gewoon' | 'fel';

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
  kind: ColorKind;
}

export const COLORS: ColorOption[] = [
  { id: 'zwart', label: 'Zwart', hex: '#232323', kind: 'neutraal' },
  { id: 'wit', label: 'Wit', hex: '#f8f7f4', kind: 'neutraal' },
  { id: 'grijs', label: 'Grijs', hex: '#9b9b98', kind: 'neutraal' },
  { id: 'beige', label: 'Beige', hex: '#d8c6a6', kind: 'neutraal' },
  { id: 'bruin', label: 'Bruin', hex: '#7a5436', kind: 'neutraal' },
  { id: 'navy', label: 'Navy', hex: '#22305a', kind: 'neutraal' },
  { id: 'denim', label: 'Denim', hex: '#4c6b95', kind: 'neutraal' },
  { id: 'blauw', label: 'Blauw', hex: '#3d7bd6', kind: 'gewoon' },
  { id: 'groen', label: 'Groen', hex: '#4f7c52', kind: 'gewoon' },
  { id: 'olijf', label: 'Olijf', hex: '#7b7c3c', kind: 'gewoon' },
  { id: 'bordeaux', label: 'Bordeaux', hex: '#6c2230', kind: 'gewoon' },
  { id: 'paars', label: 'Paars', hex: '#6b4f9b', kind: 'gewoon' },
  { id: 'rood', label: 'Rood', hex: '#d83a3a', kind: 'fel' },
  { id: 'oranje', label: 'Oranje', hex: '#ef8a25', kind: 'fel' },
  { id: 'geel', label: 'Geel', hex: '#f1c81f', kind: 'fel' },
  { id: 'roze', label: 'Roze', hex: '#ee6ba6', kind: 'fel' },
  { id: 'felgroen', label: 'Felgroen', hex: '#46c95a', kind: 'fel' },
];

export function colorInfo(id: string): ColorOption {
  return COLORS.find((c) => c.id === id) ?? { id, label: id, hex: '#cccccc', kind: 'gewoon' };
}

export function isBright(colorId: string): boolean {
  return colorInfo(colorId).kind === 'fel';
}

/** Kleuren clashen als er meer dan één felle kleur tussen zit. */
export function colorsClash(colorIds: string[]): boolean {
  return colorIds.filter(isBright).length > 1;
}
