/**
 * Draagdagboek: hulpfuncties voor de kalender en voor het bewerken van een gelogde dag.
 */
import type { ClothingItem } from '../types';
import { slotOf, toDateString, type OutfitIds } from './outfitLogic';

/**
 * De weken van een maand voor een kalender, beginnend op maandag.
 * Elke week heeft 7 vakjes: een datum ("JJJJ-MM-DD") of null voor de lege vakjes ervoor en erna.
 * `month` telt vanaf 0 (januari), zoals in JavaScript.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1, 12);
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
  // getDay(): zondag = 0. Wij beginnen op maandag, dus zondag wordt 6.
  const leading = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toDateString(new Date(year, month, day, 12)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Een gelogde dag (gewoon een lijst kledingstukken) → de onderdelen voor de outfitbouwer.
 * Trui én shirt? Dan is de trui het bovenstuk en het shirt de laag eronder.
 * Stukken die niet meer bestaan, worden overgeslagen.
 */
export function entryToOutfitIds(itemIds: string[], items: ClothingItem[]): OutfitIds {
  const worn = itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is ClothingItem => i !== undefined);
  const ids: OutfitIds = {};
  const tops = worn.filter((i) => slotOf(i) === 'top');
  const sweater = tops.find((i) => i.category === 'trui');
  const shirt = tops.find((i) => i.category === 'shirt');
  if (sweater) {
    ids.top = sweater.id;
    if (shirt) ids.layer = shirt.id;
  } else if (tops[0]) {
    ids.top = tops[0].id;
  }
  for (const slot of ['bottom', 'shoes', 'jacket'] as const) {
    const piece = worn.find((i) => slotOf(i) === slot);
    if (piece) ids[slot] = piece.id;
  }
  const accessories = worn.filter((i) => i.category === 'accessoire').map((i) => i.id);
  if (accessories.length > 0) ids.accessories = accessories;
  return ids;
}
