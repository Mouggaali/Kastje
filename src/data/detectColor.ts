// Herkent de hoofdkleur van een kledingstuk op een foto – helemaal op je eigen apparaat.
//
// Werkwijze:
// 1. Neem het midden van de foto (daar zit meestal het kledingstuk, niet de achtergrond).
// 2. Verklein dat tot 40×40 pixels.
// 3. Deel de pixels in grove kleurgroepen in en neem de grootste groep.
// 4. Zoek in onze kleurenlijst de kleur die daar het dichtst bij ligt.
import { COLORS, type ColorOption } from '../outfit/colors';

export type Rgb = [number, number, number];

/** Deel van de foto (in het midden) dat we bekijken. */
const CENTER_PART = 0.6;
const SAMPLE_SIZE = 40;

/**
 * Bepaalt de meest voorkomende kleur in een lijst RGBA-pixels
 * (zoals canvas.getImageData die geeft: r, g, b, a, r, g, b, a, …).
 */
export function pickDominant(pixels: ArrayLike<number>): Rgb {
  const groups = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue; // doorzichtige pixels overslaan
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // 8 niveaus per kleurkanaal → 512 grove groepen
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const group = groups.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    group.count += 1;
    group.r += r;
    group.g += g;
    group.b += b;
    groups.set(key, group);
  }
  let biggest: { count: number; r: number; g: number; b: number } | undefined;
  for (const group of groups.values()) {
    if (!biggest || group.count > biggest.count) biggest = group;
  }
  if (!biggest) return [128, 128, 128];
  return [biggest.r / biggest.count, biggest.g / biggest.count, biggest.b / biggest.count].map(Math.round) as Rgb;
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Afstand tussen twee kleuren, zoals het oog die ongeveer ervaart
 * ("redmean"-formule: eenvoudig, maar beter dan gewone RGB-afstand).
 */
export function colorDistance([r1, g1, b1]: Rgb, [r2, g2, b2]: Rgb): number {
  const meanRed = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + meanRed / 256) * dr * dr + 4 * dg * dg + (2 + (255 - meanRed) / 256) * db * db);
}

/** De kleur uit onze lijst die het dichtst bij `rgb` ligt. */
export function nearestColor(rgb: Rgb): ColorOption {
  let best = COLORS[0];
  let bestDistance = Infinity;
  for (const color of COLORS) {
    const distance = colorDistance(rgb, hexToRgb(color.hex));
    if (distance < bestDistance) {
      best = color;
      bestDistance = distance;
    }
  }
  return best;
}

/** Herkent de hoofdkleur van een foto en geeft de dichtstbijzijnde kleur uit de lijst. */
export async function detectColor(photo: Blob): Promise<ColorOption> {
  const bitmap = await createImageBitmap(photo);
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is niet beschikbaar');

  const margin = (1 - CENTER_PART) / 2;
  context.drawImage(
    bitmap,
    bitmap.width * margin,
    bitmap.height * margin,
    bitmap.width * CENTER_PART,
    bitmap.height * CENTER_PART,
    0,
    0,
    SAMPLE_SIZE,
    SAMPLE_SIZE,
  );
  bitmap.close();
  const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return nearestColor(pickDominant(data));
}
