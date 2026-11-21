/**
 * Outfitlogica van Kastje.
 *
 * Deze module weet niets van React of opslag: je geeft er kleding, weer en
 * draaggeschiedenis in, en je krijgt een outfit met uitleg terug.
 *
 * Werkwijze in het kort:
 * 1. Bepaal het gewenste warmteniveau (1–5) uit de gevoelstemperatuur en de wind.
 * 2. Bepaal of er een jas nodig is (koud, regen of veel wind).
 * 3. Geef elk kandidaat-kledingstuk een strafscore: hoe lager, hoe beter.
 * 4. Kies per onderdeel het stuk met de laagste score dat geen kleurclash geeft.
 */
import {
  OCCASIONS,
  type Category,
  type ClothingItem,
  type DayWeather,
  type Occasion,
  type OutfitVote,
  type SavedOutfit,
  type WearLogEntry,
} from '../types';
import { colorsClash } from './colors';
import { harmonyScore, type Harmony } from './harmony';

// ---------- Instellingen (hier kun je aan draaien) ----------

/** Vanaf deze kans op neerslag (%) rekenen we met regen. */
export const RAIN_THRESHOLD = 40;
/** Vanaf deze windsnelheid (km/u) is het "veel wind". */
export const WIND_THRESHOLD = 30;
/** Onder deze gevoelstemperatuur (°C) hoort er een jas bij. */
export const JACKET_BELOW = 15;
/** Stukken die je in zoveel dagen vóór de gekozen dag droeg, komen achteraan. */
export const RECENT_DAYS = 3;

const PENALTY = {
  /** per warmteniveau verschil met wat het weer vraagt */
  warmthStep: 10,
  /** jas of schoenen niet waterdicht terwijl het regent */
  notWaterproof: 25,
  /**
   * de afgelopen dagen al gedragen: groter dan één stap warmteverschil, zodat iets
   * anders voorgaat, maar kleiner dan "past niet bij het weer" (bijv. geen
   * waterdichte schoenen bij regen)
   */
  wornRecently: 30,
  /** zat in de vorige suggestie (voor "Andere suggestie") */
  inPreviousSuggestion: 8,
  /** maximale willekeurige variatie, zodat suggesties niet altijd gelijk zijn */
  randomness: 6,
  /** niet gelabeld voor de gekozen gelegenheid (bijv. sportschoenen naar je werk) */
  wrongOccasion: 30,
  /** per harmoniepunt onder de 100 */
  perHarmonyPoint: 0.3,
  /** per keer dat twee stukken samen in een 👎-outfit zaten */
  dislikedPair: 12,
  /** per keer dat twee stukken samen in een 👍-outfit zaten (bonus, dus negatief) */
  likedPair: -6,
};

// ---------- Types ----------

export type Slot = 'top' | 'bottom' | 'shoes' | 'jacket';

export interface Outfit {
  top?: ClothingItem;
  bottom?: ClothingItem;
  shoes?: ClothingItem;
  jacket?: ClothingItem;
  needsJacket: boolean;
  /** Onderdelen waarvoor niets in de kast lag, bijv. ["jas"] */
  missing: string[];
  explanation: string;
  harmony: Harmony;
}

export interface SuggestOptions {
  items: ClothingItem[];
  weather: DayWeather;
  wearLog: WearLogEntry[];
  /** De dag waarvoor de outfit is, als "JJJJ-MM-DD" */
  date: string;
  /** De vorige suggestie: die stukken krijgen een kleine straf, zodat je iets anders ziet. */
  avoid?: Outfit | null;
  /** Voor welke gelegenheid (werk, sport, …) */
  occasion?: Occasion | null;
  /** Dit stuk moet erin; de rest wordt eromheen gekozen. */
  anchor?: ClothingItem | null;
  /** Je 👍 en 👎 op eerdere suggesties */
  votes?: OutfitVote[];
  /** Te vervangen in tests, zodat de uitkomst voorspelbaar is. */
  random?: () => number;
}

/** De losse stukken van een outfit, per onderdeel. */
export type OutfitPieces = Partial<Record<Slot, ClothingItem>>;

export const SLOTS: Slot[] = ['top', 'bottom', 'shoes', 'jacket'];

export const SLOT_CATEGORIES: Record<Slot, Category[]> = {
  top: ['shirt', 'trui'],
  bottom: ['broek', 'rokjurk'],
  shoes: ['schoenen'],
  jacket: ['jas'],
};

export const SLOT_NAMES: Record<Slot, string> = {
  top: 'bovenstuk',
  bottom: 'onderstuk',
  shoes: 'schoenen',
  jacket: 'jas',
};

// ---------- Weerregels ----------

/** Gevoelstemperatuur → warmteniveau 1 (heel licht) t/m 5 (heel warm). Wind maakt het een niveau warmer. */
export function targetWarmth(feelsLike: number, windSpeed: number): number {
  let level: number;
  if (feelsLike > 22) level = 1;
  else if (feelsLike >= 17) level = 2;
  else if (feelsLike >= 11) level = 3;
  else if (feelsLike >= 5) level = 4;
  else level = 5;
  if (windSpeed >= WIND_THRESHOLD) level += 1;
  return Math.min(5, level);
}

export function weatherConditions(weather: DayWeather) {
  const rainy = weather.rainChance >= RAIN_THRESHOLD;
  const windy = weather.windSpeed >= WIND_THRESHOLD;
  const cold = weather.feelsLike < JACKET_BELOW;
  return { rainy, windy, cold, needsJacket: rainy || windy || cold };
}

// ---------- Datums en draaggeschiedenis ----------

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Gedragen in de RECENT_DAYS dagen vóór `date` (de dag zelf telt niet mee). */
export function wornRecently(itemId: string, wearLog: WearLogEntry[], date: string): boolean {
  const from = addDays(date, -RECENT_DAYS);
  return wearLog.some((entry) => entry.date >= from && entry.date < date && entry.itemIds.includes(itemId));
}

// ---------- Leren van 👍 en 👎 ----------

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Hoe goed passen twee stukken volgens jouw eerdere 👍 en 👎?
 * Geeft per paar strafpunten (positief = vaker afgekeurd, negatief = vaker goedgekeurd).
 */
export function pairAffinity(votes: OutfitVote[]): Map<string, number> {
  const affinity = new Map<string, number>();
  for (const vote of votes) {
    const points = vote.vote === 1 ? PENALTY.likedPair : PENALTY.dislikedPair;
    for (let i = 0; i < vote.itemIds.length; i++) {
      for (let j = i + 1; j < vote.itemIds.length; j++) {
        const key = pairKey(vote.itemIds[i], vote.itemIds[j]);
        affinity.set(key, (affinity.get(key) ?? 0) + points);
      }
    }
  }
  return affinity;
}

/** In welk onderdeel hoort een kledingstuk? (Accessoires horen nergens bij.) */
export function slotOf(item: Pick<ClothingItem, 'category'>): Slot | undefined {
  return SLOTS.find((slot) => SLOT_CATEGORIES[slot].includes(item.category));
}

// ---------- Kiezen ----------

interface ScoreContext {
  target: number;
  rainy: boolean;
  wearLog: WearLogEntry[];
  date: string;
  avoidIds: Set<string>;
  occasion?: Occasion | null;
  affinity: Map<string, number>;
  random: () => number;
}

/** Strafscore voor één stuk, gegeven wat al gekozen is: hoe lager, hoe beter het past. */
function score(item: ClothingItem, slot: Slot, ctx: ScoreContext, chosen: ClothingItem[]): number {
  let points = Math.abs(item.warmth - ctx.target) * PENALTY.warmthStep;
  const needsWaterproof = ctx.rainy && (slot === 'jacket' || slot === 'shoes');
  if (needsWaterproof && !item.waterproof) points += PENALTY.notWaterproof;
  if (wornRecently(item.id, ctx.wearLog, ctx.date)) points += PENALTY.wornRecently;
  if (ctx.avoidIds.has(item.id)) points += PENALTY.inPreviousSuggestion;
  if (ctx.occasion && !item.occasions?.includes(ctx.occasion)) points += PENALTY.wrongOccasion;
  points += (100 - harmonyScore([...chosen, item]).score) * PENALTY.perHarmonyPoint;
  for (const other of chosen) points += ctx.affinity.get(pairKey(item.id, other.id)) ?? 0;
  points += ctx.random() * PENALTY.randomness;
  return points;
}

/** Beste stuk voor een onderdeel, gegeven wat al gekozen is. */
function pickForSlot(
  items: ClothingItem[],
  slot: Slot,
  ctx: ScoreContext,
  chosen: ClothingItem[],
): ClothingItem | undefined {
  const ranked = items
    .filter((item) => SLOT_CATEGORIES[slot].includes(item.category))
    .map((item) => ({ item, points: score(item, slot, ctx, chosen) }))
    .sort((a, b) => a.points - b.points)
    .map((entry) => entry.item);
  // Harde regel: liefst geen twee felle kleuren; lukt dat niet, dan toch het beste stuk.
  const colors = chosen.map((i) => i.color);
  return ranked.find((item) => !colorsClash([...colors, item.color])) ?? ranked[0];
}

/** De stukken van een outfit in vaste volgorde: boven, onder, schoenen, jas. */
export function outfitItems(outfit: OutfitPieces | null | undefined): ClothingItem[] {
  if (!outfit) return [];
  return SLOTS.map((slot) => outfit[slot]).filter((item): item is ClothingItem => item !== undefined);
}

/** Bewaarde outfit (met ids) → de echte kledingstukken. Verwijderde stukken vallen weg. */
export function resolveSavedOutfit(saved: SavedOutfit, items: ClothingItem[]): OutfitPieces {
  const pieces: OutfitPieces = {};
  for (const slot of SLOTS) {
    const item = items.find((i) => i.id === saved[slot]);
    if (item) pieces[slot] = item;
  }
  return pieces;
}

/** Een vooraf gekozen outfit (bewaard of gepland) als volledige Outfit, met uitleg en harmonie. */
export function outfitFromPieces(pieces: OutfitPieces, weather: DayWeather): Outfit {
  return {
    ...pieces,
    needsJacket: weatherConditions(weather).needsJacket,
    missing: [],
    explanation: explain(weather, pieces),
    harmony: harmonyScore(outfitItems(pieces)),
  };
}

/** Hoeveel stukken van een bewaarde outfit niet meer in de kast zitten. */
export function missingFromSaved(saved: SavedOutfit, items: ClothingItem[]): number {
  return SLOTS.filter((slot) => saved[slot] && !items.some((i) => i.id === saved[slot])).length;
}

/** Stelt een complete outfit samen voor het opgegeven weer. */
export function suggestOutfit(options: SuggestOptions): Outfit {
  const { items, weather, wearLog, date, avoid, occasion, anchor, votes = [], random = Math.random } = options;
  const conditions = weatherConditions(weather);
  const ctx: ScoreContext = {
    target: targetWarmth(weather.feelsLike, weather.windSpeed),
    rainy: conditions.rainy,
    wearLog,
    date,
    avoidIds: new Set(outfitItems(avoid).map((item) => item.id)),
    occasion,
    affinity: pairAffinity(votes),
    random,
  };

  const chosen: OutfitPieces = {};
  const missing: string[] = [];

  // Een vastgezet stuk gaat er altijd in; de rest wordt eromheen gekozen.
  const anchorSlot = anchor ? slotOf(anchor) : undefined;
  if (anchor && anchorSlot) chosen[anchorSlot] = anchor;

  // De jas eerst: die is bij slecht weer het belangrijkst, de rest past zich qua kleur aan.
  const slots: Slot[] = conditions.needsJacket ? ['jacket', 'top', 'bottom', 'shoes'] : ['top', 'bottom', 'shoes'];
  for (const slot of slots) {
    if (chosen[slot]) continue;
    const item = pickForSlot(items, slot, ctx, outfitItems(chosen));
    if (item) chosen[slot] = item;
    else missing.push(SLOT_NAMES[slot]);
  }

  let explanation = explain(weather, chosen);
  if (anchor && anchorSlot) explanation += ` Rond je ${anchor.name.toLowerCase()} gebouwd.`;
  if (occasion) {
    const label = OCCASIONS.find((o) => o.value === occasion)?.label.toLowerCase();
    const notLabelled = outfitItems(chosen).filter((i) => !i.occasions?.includes(occasion));
    explanation +=
      notLabelled.length > 0
        ? ` Let op: ${joinDutch(notLabelled.map((i) => i.name.toLowerCase()))} ${notLabelled.length === 1 ? 'is' : 'zijn'} niet gelabeld voor ${label}.`
        : ` Gekozen voor ${label}.`;
  }

  return {
    ...chosen,
    needsJacket: conditions.needsJacket,
    missing,
    explanation,
    harmony: harmonyScore(outfitItems(chosen)),
  };
}

// ---------- Uitleg in gewone taal ----------

type Gender = 'de' | 'het' | 'meervoud';

const NOUNS: Record<Category, { noun: string; gender: Gender }> = {
  shirt: { noun: 'shirt', gender: 'het' },
  trui: { noun: 'trui', gender: 'de' },
  jas: { noun: 'jas', gender: 'de' },
  broek: { noun: 'broek', gender: 'de' },
  rokjurk: { noun: 'rok of jurk', gender: 'de' },
  schoenen: { noun: 'schoenen', gender: 'meervoud' },
  accessoire: { noun: 'accessoire', gender: 'het' },
};

const WARMTH_ADJECTIVES: Record<number, string> = {
  1: 'luchtig',
  2: 'licht',
  3: '',
  4: 'warm',
  5: 'heel warm',
};

/** "een warme trui", "een warm shirt", "waterdichte schoenen" */
function describeItem(item: ClothingItem, adjectives: string[]): string {
  const { noun, gender } = NOUNS[item.category];
  // Bij "een" + het-woord blijft het bijvoeglijk naamwoord kaal ("een warm shirt").
  const words = adjectives.filter(Boolean).map((adj) => (gender === 'het' ? adj : `${adj}e`));
  const phrase = [words.join(', '), noun].filter(Boolean).join(' ');
  return gender === 'meervoud' ? phrase : `een ${phrase}`;
}

/** "a", "a en b", "a, b en c" */
function joinDutch(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
}

export function explain(weather: DayWeather, chosen: Partial<Record<Slot, ClothingItem>>): string {
  const { rainy, windy } = weatherConditions(weather);

  const circumstances: string[] = [];
  if (rainy) circumstances.push(`${weather.rainChance}% kans op regen`);
  if (windy) circumstances.push('veel wind');
  const weatherText =
    circumstances.length > 0
      ? `Het is ${weather.feelsLike} °C met ${joinDutch(circumstances)}`
      : `Het is ${weather.feelsLike} °C en droog`;

  const reasons: string[] = [];
  if (chosen.top) reasons.push(describeItem(chosen.top, [WARMTH_ADJECTIVES[chosen.top.warmth]]));
  if (chosen.jacket) {
    const adjective = rainy && chosen.jacket.waterproof ? 'waterdicht' : WARMTH_ADJECTIVES[chosen.jacket.warmth];
    reasons.push(describeItem(chosen.jacket, [adjective]));
  }
  if (rainy && chosen.shoes?.waterproof) reasons.push(describeItem(chosen.shoes, ['waterdicht']));

  let text = reasons.length > 0 ? `${weatherText}, daarom ${joinDutch(reasons)}.` : `${weatherText}.`;
  if (rainy && chosen.jacket && !chosen.jacket.waterproof) text += ' Let op: je jas is niet waterdicht.';
  if (rainy && !chosen.jacket) text += ' Neem een paraplu mee.';
  return text;
}
