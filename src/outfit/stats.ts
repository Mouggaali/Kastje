/**
 * Inzicht in je kledingkast: wat draag je, wat "slaapt", welke kleuren heb je,
 * en wat kost elk stuk per keer dragen. Alles op basis van "Dit draag ik vandaag".
 */
import type { ClothingItem, WearLogEntry } from '../types';
import { COLORS, type ColorOption } from './colors';
import { addDays, toDateString } from './outfitLogic';

/** Na zoveel dagen niet gedragen telt een stuk als "slaper". */
export const SLEEPER_DAYS = 30;
/** Nieuwe stukken krijgen eerst zoveel dagen de tijd voordat ze kunnen "slapen". */
export const NEW_ITEM_GRACE_DAYS = 14;

export interface ItemStats {
  item: ClothingItem;
  count: number;
  /** Laatste keer gedragen, als "JJJJ-MM-DD" */
  lastWorn?: string;
}

export function wearStats(items: ClothingItem[], wearLog: WearLogEntry[]): ItemStats[] {
  return items.map((item) => {
    const dates = wearLog.filter((entry) => entry.itemIds.includes(item.id)).map((entry) => entry.date);
    return { item, count: dates.length, lastWorn: dates.sort().at(-1) };
  });
}

/** De vaakst gedragen stukken. */
export function mostWorn(stats: ItemStats[], limit = 5): ItemStats[] {
  return stats
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.item.name.localeCompare(b.item.name, 'nl'))
    .slice(0, limit);
}

/** Stukken die al lang (of nog nooit) gedragen zijn. De langst slapende eerst. */
export function sleepers(stats: ItemStats[], today: string): ItemStats[] {
  const sleepSince = addDays(today, -SLEEPER_DAYS);
  const graceUntil = addDays(today, -NEW_ITEM_GRACE_DAYS);
  return stats
    .filter(({ item, lastWorn }) => {
      if (item.archived) return false;
      if (lastWorn) return lastWorn <= sleepSince;
      // Nooit gedragen: alleen als het stuk al even in je kast zit. Zonder datum = oud stuk.
      const added = item.createdAt ? toDateString(new Date(item.createdAt)) : '0000-00-00';
      return added <= graceUntil;
    })
    .sort((a, b) => (a.lastWorn ?? '').localeCompare(b.lastWorn ?? ''));
}

/** Hoeveel stukken je per kleur hebt, de meest voorkomende eerst. */
export function colorBreakdown(items: ClothingItem[]): { color: ColorOption; count: number }[] {
  return COLORS.map((color) => ({ color, count: items.filter((i) => i.color === color.id).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface CostPerWear {
  item: ClothingItem;
  price: number;
  count: number;
  /** Prijs gedeeld door het aantal keer gedragen (nooit gedragen = de volle prijs) */
  perWear: number;
}

/** Prijs per keer dragen, de duurste per keer eerst. Alleen stukken met een prijs. */
export function costPerWear(stats: ItemStats[]): CostPerWear[] {
  return stats
    .filter((s) => s.item.price !== undefined)
    .map((s) => ({ item: s.item, price: s.item.price!, count: s.count, perWear: s.item.price! / Math.max(1, s.count) }))
    .sort((a, b) => b.perWear - a.perWear);
}
