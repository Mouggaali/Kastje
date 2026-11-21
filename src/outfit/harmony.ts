/**
 * Kleurharmonie: hoe goed passen de kleuren van een outfit bij elkaar? (0–100)
 *
 * Eenvoudige regels, zoals een stylist ze ook gebruikt:
 * - Neutrale kleuren (zwart, wit, grijs, beige, bruin, navy, denim) passen altijd.
 * - Eén accentkleur op een neutrale basis is het veiligst en mooist.
 * - Meerdere accentkleuren werken als ze dicht bij elkaar liggen (tint-op-tint)
 *   of juist tegenover elkaar op de kleurencirkel (complementair).
 * - Tinten daartussenin botsen sneller, en twee felle kleuren botsen bijna altijd.
 */
import type { ClothingItem } from '../types';
import { colorInfo } from './colors';

export interface Harmony {
  score: number;
  /** "Sterk", "Goed" of "Gewaagd" */
  label: string;
  /** Korte uitleg in gewone taal */
  reason: string;
}

/** Tint (0–360°) van een hex-kleur. */
export function hueOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

/** Afstand tussen twee tinten op de kleurencirkel (0–180°). */
function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function labelFor(score: number): string {
  if (score >= 85) return 'Sterk';
  if (score >= 65) return 'Goed';
  return 'Gewaagd';
}

export function harmonyScore(items: ClothingItem[]): Harmony {
  const colors = items.map((item) => colorInfo(item.color));
  const accents = colors.filter((c) => c.kind !== 'neutraal');
  const bright = colors.filter((c) => c.kind === 'fel').length;

  let score: number;
  let reason: string;

  if (accents.length === 0) {
    score = 90;
    reason = 'Rustig en tijdloos: alleen neutrale kleuren';
  } else if (accents.length === 1) {
    score = 96;
    reason = 'Neutraal met één accent';
  } else {
    // De grootste afstand tussen twee accentkleuren bepaalt of ze samengaan.
    const hues = accents.map((c) => hueOf(c.hex));
    let widest = 0;
    for (const a of hues) for (const b of hues) widest = Math.max(widest, hueDistance(a, b));

    if (widest <= 60) {
      score = 90;
      reason = 'Tint-op-tint';
    } else if (widest >= 130) {
      score = 82;
      reason = 'Complementair contrast';
    } else {
      score = 62;
      reason = 'Tinten die met elkaar botsen';
    }
    // Meer dan twee accentkleuren wordt al snel druk.
    const distinctAccents = new Set(accents.map((c) => c.id)).size;
    if (distinctAccents > 2) {
      score -= 10 * (distinctAccents - 2);
      reason = 'Veel kleuren tegelijk';
    }
  }

  if (bright > 1) {
    score -= 35 * (bright - 1);
    reason = bright === 2 ? 'Twee felle kleuren botsen' : 'Te veel felle kleuren';
  }

  score = Math.max(0, Math.min(100, score));
  return { score, label: labelFor(score), reason };
}
