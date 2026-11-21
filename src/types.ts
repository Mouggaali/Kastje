// Alle gedeelde datatypes van de app op één plek.

export type Category = 'shirt' | 'trui' | 'jas' | 'broek' | 'rokjurk' | 'schoenen' | 'accessoire';

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'shirt', label: 'Shirt', icon: '👕' },
  { value: 'trui', label: 'Trui', icon: '🧶' },
  { value: 'jas', label: 'Jas', icon: '🧥' },
  { value: 'broek', label: 'Broek', icon: '👖' },
  { value: 'rokjurk', label: 'Rok/jurk', icon: '👗' },
  { value: 'schoenen', label: 'Schoenen', icon: '👟' },
  { value: 'accessoire', label: 'Accessoire', icon: '🧣' },
];

export function categoryInfo(category: Category) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
}

/** 1 = heel licht, 5 = heel warm */
export type Warmth = 1 | 2 | 3 | 4 | 5;

export const WARMTH_LABELS: Record<Warmth, string> = {
  1: 'Heel licht',
  2: 'Licht',
  3: 'Gemiddeld',
  4: 'Warm',
  5: 'Heel warm',
};

export type Occasion = 'casual' | 'werk' | 'sport' | 'feest';

export const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'werk', label: 'Werk' },
  { value: 'sport', label: 'Sport' },
  { value: 'feest', label: 'Feest' },
];

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  /** Voor welke gelegenheden je dit draagt */
  occasions: Occasion[];
  /** Aankoopprijs in euro's (optioneel), voor "prijs per keer dragen" */
  price?: number;
  /** Gearchiveerd = opgeruimd, maar terug te zetten */
  archived?: boolean;
  /** Wanneer het stuk is toegevoegd */
  createdAt?: number;
  /** id uit de kleurenlijst in outfit/colors.ts, bijvoorbeeld "navy" */
  color: string;
  warmth: Warmth;
  waterproof: boolean;
  /** true als er een foto in IndexedDB staat onder dit id */
  hasPhoto: boolean;
  /** tijdstip van de laatste wijziging, zodat een nieuwe foto direct ververst */
  updatedAt: number;
}

/** Wat je op een bepaalde dag hebt gedragen. */
export interface WearLogEntry {
  /** datum als "JJJJ-MM-DD" */
  date: string;
  itemIds: string[];
}

/** 👍 of 👎 op een suggestie. */
export interface OutfitVote {
  itemIds: string[];
  vote: 1 | -1;
  date: string;
}

/** Een vooruit geplande outfit voor één dag. De velden bevatten item-ids. */
export interface PlannedDay {
  date: string;
  top?: string;
  bottom?: string;
  shoes?: string;
  jacket?: string;
}

/** Een outfit die je zelf hebt samengesteld of bewaard. De velden bevatten item-ids. */
export interface SavedOutfit {
  id: string;
  name: string;
  top?: string;
  bottom?: string;
  shoes?: string;
  jacket?: string;
  createdAt: number;
}

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

/** Samenvatting van het weer overdag (7:00–21:00) voor één dag. */
export interface DayWeather {
  date: string;
  /** gemiddelde gevoelstemperatuur overdag in °C */
  feelsLike: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  /** hoogste kans op neerslag overdag in % */
  rainChance: number;
  /** hoogste windsnelheid overdag in km/u */
  windSpeed: number;
  /** WMO-weercode van Open-Meteo */
  weatherCode: number;
}
