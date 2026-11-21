/**
 * Paklijst voor een reis: per dag een outfit voor het weer op je bestemming,
 * en daarna één lijst met alles wat mee moet.
 *
 * De keuzes zijn bewust vast (geen toeval): dagen met vergelijkbaar weer krijgen
 * dezelfde stukken, zodat je koffer zo klein mogelijk blijft.
 */
import { CATEGORIES, type Category, type ClothingItem, type DayWeather, type Occasion } from '../types';
import { outfitItems, suggestOutfit, type Outfit } from './outfitLogic';

export interface PackingDay {
  weather: DayWeather;
  outfit: Outfit;
}

export interface PackingEntry {
  item: ClothingItem;
  /** Op welke dagen je het draagt */
  dates: string[];
}

export interface PackingResult {
  days: PackingDay[];
  /** Per categorie, in de vaste volgorde van de kast */
  groups: { category: Category; label: string; entries: PackingEntry[] }[];
  /** Totaal aantal stuks */
  count: number;
}

export function packingList(items: ClothingItem[], days: DayWeather[], occasion?: Occasion | null): PackingResult {
  const planned: PackingDay[] = days.map((weather) => ({
    weather,
    outfit: suggestOutfit({ items, weather, wearLog: [], date: weather.date, occasion, random: () => 0.5 }),
  }));

  const entries = new Map<string, PackingEntry>();
  for (const { weather, outfit } of planned) {
    for (const item of outfitItems(outfit)) {
      const entry = entries.get(item.id) ?? { item, dates: [] };
      entry.dates.push(weather.date);
      entries.set(item.id, entry);
    }
  }

  const groups = CATEGORIES.map(({ value, label }) => ({
    category: value,
    label,
    entries: [...entries.values()].filter((e) => e.item.category === value),
  })).filter((group) => group.entries.length > 0);

  return { days: planned, groups, count: entries.size };
}
