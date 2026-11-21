// Opslag van gegevens in localStorage (blijft op dit apparaat).
import type {
  ClothingItem,
  Occasion,
  OutfitVote,
  Place,
  PlannedDay,
  SavedOutfit,
  WearLogEntry,
} from '../types';
import { sampleItems } from './sampleItems';

const KEYS = {
  items: 'kastje.items',
  wearLog: 'kastje.wearLog',
  place: 'kastje.place',
  outfits: 'kastje.outfits',
  votes: 'kastje.votes',
  plan: 'kastje.plan',
  occasion: 'kastje.occasion',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Opslaan mislukt', error);
  }
}

/**
 * Vult ontbrekende velden aan bij kleding die met een oudere versie van Kastje is opgeslagen,
 * zodat oude gegevens blijven werken.
 */
export function normalizeItem(raw: Partial<ClothingItem> & { id: string }): ClothingItem {
  return {
    name: 'Naamloos',
    category: 'shirt',
    color: 'zwart',
    warmth: 3,
    waterproof: false,
    hasPhoto: false,
    updatedAt: 0,
    ...raw,
    occasions: Array.isArray(raw.occasions) && raw.occasions.length > 0 ? raw.occasions : ['casual'],
  };
}

/** Bij de allereerste keer staat er nog niets: dan krijg je de voorbeeldstukken. */
export function loadItems(): ClothingItem[] {
  if (localStorage.getItem(KEYS.items) === null) {
    write(KEYS.items, sampleItems);
    return sampleItems;
  }
  return read<ClothingItem[]>(KEYS.items, []).map(normalizeItem);
}

export function saveItems(items: ClothingItem[]): void {
  write(KEYS.items, items);
}

export function loadWearLog(): WearLogEntry[] {
  return read<WearLogEntry[]>(KEYS.wearLog, []);
}

export function saveWearLog(log: WearLogEntry[]): void {
  write(KEYS.wearLog, log);
}

export function loadSavedOutfits(): SavedOutfit[] {
  return read<SavedOutfit[]>(KEYS.outfits, []);
}

export function saveSavedOutfits(outfits: SavedOutfit[]): void {
  write(KEYS.outfits, outfits);
}

export function loadVotes(): OutfitVote[] {
  return read<OutfitVote[]>(KEYS.votes, []);
}

export function saveVotes(votes: OutfitVote[]): void {
  write(KEYS.votes, votes);
}

export function loadPlan(): PlannedDay[] {
  return read<PlannedDay[]>(KEYS.plan, []);
}

export function savePlan(plan: PlannedDay[]): void {
  write(KEYS.plan, plan);
}

export function loadOccasion(): Occasion | null {
  return read<Occasion | null>(KEYS.occasion, null);
}

export function saveOccasion(occasion: Occasion | null): void {
  write(KEYS.occasion, occasion);
}

export function loadPlace(): Place | null {
  return read<Place | null>(KEYS.place, null);
}

export function savePlace(place: Place): void {
  write(KEYS.place, place);
}

/** Eenvoudig uniek id (crypto.randomUUID werkt niet overal op een telefoon via http). */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
