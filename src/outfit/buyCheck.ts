/**
 * Koop-check: "Moet ik dit kopen?" – op basis van wat er al in je kast hangt.
 *
 * 1. Heb je al iets vergelijkbaars? (zelfde soort, (bijna) dezelfde kleur, ongeveer even warm)
 * 2. Met hoeveel van je kleding vormt het een outfit waarvan de kleuren goed samengaan?
 */
import { colorDistance, hexToRgb } from '../data/detectColor';
import type { Category, ClothingItem, Pattern, Warmth } from '../types';
import { colorInfo } from './colors';
import { harmonyScore } from './harmony';
import { outfitItems, SLOT_CATEGORIES, slotOf, type OutfitPieces, type Slot } from './outfitLogic';

/** Kleuren die dichter bij elkaar liggen dan dit tellen als "vrijwel dezelfde". */
const SIMILAR_COLOR_DISTANCE = 120;
/** Vanaf deze harmonie telt een combinatie als "goed". */
const GOOD_HARMONY = 65;
/** Vanaf zoveel goede combinaties is het een aanrader. */
const ENOUGH_COMBINATIONS = 3;

export interface BuyCandidate {
  category: Category;
  color: string;
  warmth: Warmth;
  /** Zonder waarde = effen */
  pattern?: Pattern;
}

export type Verdict = 'koop' | 'twijfel' | 'skip';

export interface BuyCheckResult {
  verdict: Verdict;
  title: string;
  reason: string;
  /** Wat je al hebt dat erop lijkt */
  similar: ClothingItem[];
  /** Aantal goede outfits (boven + onder + schoenen) met het nieuwe stuk */
  combinations: number;
  /** De twee mooiste voorbeeldoutfits */
  examples: OutfitPieces[];
}

function colorsAlike(a: string, b: string): boolean {
  if (a === b) return true;
  return colorDistance(hexToRgb(colorInfo(a).hex), hexToRgb(colorInfo(b).hex)) < SIMILAR_COLOR_DISTANCE;
}

export function buyCheck(candidate: BuyCandidate, items: ClothingItem[]): BuyCheckResult {
  const newItem: ClothingItem = {
    id: 'koop-check',
    name: 'Nieuw stuk',
    ...candidate,
    occasions: [],
    waterproof: false,
    hasPhoto: false,
    updatedAt: 0,
  };

  const similar = items.filter(
    (i) =>
      i.category === candidate.category &&
      colorsAlike(i.color, candidate.color) &&
      (i.pattern ?? 'effen') === (candidate.pattern ?? 'effen') &&
      Math.abs(i.warmth - candidate.warmth) <= 1,
  );

  // Alle combinaties boven × onder × schoenen met het nieuwe stuk op zijn eigen plek.
  const ownSlot = slotOf(candidate);
  const slots: Slot[] = ['top', 'bottom', 'shoes'];
  const options = slots.map((slot) =>
    slot === ownSlot ? [newItem] : items.filter((i) => SLOT_CATEGORIES[slot].includes(i.category)),
  );
  const scored: { pieces: OutfitPieces; score: number }[] = [];
  if (ownSlot) {
    for (const top of options[0])
      for (const bottom of options[1])
        for (const shoes of options[2]) {
          const pieces: OutfitPieces = { top, bottom, shoes };
          // Een jas combineert met elke goede basis; die tellen we als jas + basis.
          if (ownSlot === 'jacket') pieces.jacket = newItem;
          const score = harmonyScore(outfitItems(pieces)).score;
          if (score >= GOOD_HARMONY) scored.push({ pieces, score });
        }
  }
  scored.sort((a, b) => b.score - a.score);
  const combinations = scored.length;
  const examples = scored.slice(0, 2).map((s) => s.pieces);

  if (similar.length > 0) {
    const names = similar.slice(0, 2).map((i) => i.name.toLowerCase()).join(' en ');
    return {
      verdict: 'skip',
      title: 'Sla over',
      reason: `Je hebt al iets vergelijkbaars: ${names}.`,
      similar,
      combinations,
      examples,
    };
  }
  if (!ownSlot) {
    return {
      verdict: 'twijfel',
      title: 'Twijfel',
      reason: 'Accessoires telt Kastje (nog) niet mee in outfits. Je hebt in elk geval niets vergelijkbaars.',
      similar,
      combinations,
      examples,
    };
  }
  if (combinations >= ENOUGH_COMBINATIONS) {
    return {
      verdict: 'koop',
      title: 'Koop het',
      reason: `Nieuw in je kast en het past in ${combinations} goede outfits met wat je al hebt.`,
      similar,
      combinations,
      examples,
    };
  }
  return {
    verdict: 'twijfel',
    title: 'Twijfel',
    reason:
      combinations === 0
        ? 'Je hebt nog niets waarmee de kleuren goed samengaan, of er ontbreekt een boven-, onderstuk of schoenen.'
        : `Het past maar in ${combinations} goede outfit${combinations === 1 ? '' : 's'} met wat je al hebt.`,
    similar,
    combinations,
    examples,
  };
}
