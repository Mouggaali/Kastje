import { describe, expect, it } from 'vitest';
import type { ClothingItem, DayWeather, Warmth } from '../types';
import { colorsClash } from './colors';
import {
  addDays,
  missingFromSaved,
  outfitItems,
  pairAffinity,
  piecesToIds,
  resolveSavedOutfit,
  sameOutfit,
  suggestOutfit,
  targetWarmth,
  wornRecently,
} from './outfitLogic';

// ---------- Hulpjes om testgegevens te maken ----------

function item(id: string, category: ClothingItem['category'], warmth: Warmth, extra: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id,
    name: id,
    category,
    warmth,
    color: 'zwart',
    occasions: ['casual'],
    waterproof: false,
    hasPhoto: false,
    updatedAt: 0,
    ...extra,
  };
}

function weather(feelsLike: number, rainChance = 0, windSpeed = 10): DayWeather {
  return { date: '2026-11-19', feelsLike, feelsLikeMin: feelsLike, feelsLikeMax: feelsLike, rainChance, windSpeed, weatherCode: 3 };
}

const TODAY = '2026-11-19';
const noRandom = () => 0; // maakt de uitkomst voorspelbaar

const wardrobe: ClothingItem[] = [
  item('t-shirt', 'shirt', 1),
  item('wollen trui', 'trui', 4),
  item('winterjas', 'jas', 4),
  item('regenjas', 'jas', 3, { waterproof: true }),
  item('jeans', 'broek', 3),
  item('korte broek', 'broek', 1),
  item('sneakers', 'schoenen', 2),
  item('laarzen', 'schoenen', 4, { waterproof: true }),
];

// ---------- Tests ----------

describe('targetWarmth', () => {
  it('kiest warmere kleding naarmate het kouder is', () => {
    expect(targetWarmth(25, 0)).toBe(1);
    expect(targetWarmth(18, 0)).toBe(2);
    expect(targetWarmth(12, 0)).toBe(3);
    expect(targetWarmth(6, 0)).toBe(4);
    expect(targetWarmth(-2, 0)).toBe(5);
  });

  it('maakt het een niveau warmer bij veel wind, maar nooit boven 5', () => {
    expect(targetWarmth(12, 40)).toBe(4);
    expect(targetWarmth(-2, 40)).toBe(5);
  });
});

describe('suggestOutfit', () => {
  it('koud en regen: warme trui, waterdichte jas en schoenen', () => {
    const outfit = suggestOutfit({ items: wardrobe, weather: weather(6, 70), wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.top?.id).toBe('wollen trui');
    expect(outfit.jacket?.id).toBe('regenjas');
    expect(outfit.shoes?.id).toBe('laarzen');
    expect(outfit.bottom?.id).toBe('jeans');
    expect(outfit.explanation).toBe(
      // Onder de 8 °C komt er een shirt onder de trui (zie "laagjes en accessoires").
      'Het is 6 °C met 70% kans op regen, daarom een warme trui met een shirt eronder, een waterdichte jas en waterdichte schoenen.',
    );
  });

  it('warm en droog: luchtig, en geen jas', () => {
    const outfit = suggestOutfit({ items: wardrobe, weather: weather(25), wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.needsJacket).toBe(false);
    expect(outfit.jacket).toBeUndefined();
    expect(outfit.top?.id).toBe('t-shirt');
    expect(outfit.bottom?.id).toBe('korte broek');
    expect(outfit.explanation).toBe('Het is 25 °C en droog, daarom een luchtig shirt.');
  });

  it('combineert maximaal één felle kleur', () => {
    const items = [
      item('rood shirt', 'shirt', 1, { color: 'rood' }),
      item('gele rok', 'rokjurk', 1, { color: 'geel' }), // past qua warmte het best, maar clasht
      item('zwarte short', 'broek', 2, { color: 'zwart' }),
      item('sneakers', 'schoenen', 1, { color: 'wit' }),
    ];
    const outfit = suggestOutfit({ items, weather: weather(25), wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.top?.id).toBe('rood shirt');
    expect(outfit.bottom?.id).toBe('zwarte short');
  });

  it('zet stukken die je de afgelopen 3 dagen droeg achteraan', () => {
    const items = [item('shirt A', 'shirt', 1), item('shirt B', 'shirt', 1)];
    const yesterday = [{ date: addDays(TODAY, -1), itemIds: ['shirt A'] }];
    const longAgo = [{ date: addDays(TODAY, -4), itemIds: ['shirt A'] }];

    const recent = suggestOutfit({ items, weather: weather(25), wearLog: yesterday, date: TODAY, random: noRandom });
    expect(recent.top?.id).toBe('shirt B');

    const old = suggestOutfit({ items, weather: weather(25), wearLog: longAgo, date: TODAY, random: noRandom });
    expect(old.top?.id).toBe('shirt A');
  });

  it('laat het weer zwaarder wegen dan "recent gedragen"', () => {
    // Laarzen gisteren gedragen, maar het regent: liever nog eens laarzen dan sneakers.
    const yesterday = [{ date: addDays(TODAY, -1), itemIds: ['laarzen'] }];
    const outfit = suggestOutfit({ items: wardrobe, weather: weather(2, 80), wearLog: yesterday, date: TODAY, random: noRandom });
    expect(outfit.shoes?.id).toBe('laarzen');
  });

  it('kiest bij "Andere suggestie" iets anders als dat kan', () => {
    const items = [item('shirt A', 'shirt', 1), item('shirt B', 'shirt', 1)];
    const first = suggestOutfit({ items, weather: weather(25), wearLog: [], date: TODAY, random: noRandom });
    const second = suggestOutfit({ items, weather: weather(25), wearLog: [], date: TODAY, avoid: first, random: noRandom });
    expect(second.top?.id).not.toBe(first.top?.id);
  });

  it('meldt wat ontbreekt bij een lege kast, zonder te crashen', () => {
    const outfit = suggestOutfit({ items: [], weather: weather(6, 70), wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.missing).toEqual(['jas', 'bovenstuk', 'onderstuk', 'schoenen']);
    expect(outfit.explanation).toBe('Het is 6 °C met 70% kans op regen. Neem een paraplu mee.');
  });
});

describe('gelegenheid, vastzetten en stemmen', () => {
  const closet: ClothingItem[] = [
    item('hoodie', 'trui', 3, { occasions: ['casual'] }),
    item('blouse', 'shirt', 3, { occasions: ['werk'] }),
    item('jeans', 'broek', 3, { occasions: ['casual', 'werk'] }),
    item('pantalon', 'broek', 3, { occasions: ['werk'] }),
    item('sneakers', 'schoenen', 3, { occasions: ['casual'] }),
    item('loafers', 'schoenen', 3, { occasions: ['werk'] }),
  ];
  const mild = weather(18);

  it('kiest bij "werk" de stukken die voor werk gelabeld zijn', () => {
    const outfit = suggestOutfit({ items: closet, weather: mild, wearLog: [], date: TODAY, occasion: 'werk', random: noRandom });
    expect(outfit.top?.id).toBe('blouse');
    expect(outfit.shoes?.id).toBe('loafers');
    expect(outfit.explanation).toContain('Gekozen voor werk.');
  });

  it('meldt het als iets niet voor de gelegenheid gelabeld is', () => {
    const outfit = suggestOutfit({
      items: closet.filter((i) => i.id !== 'blouse'),
      weather: mild,
      wearLog: [],
      date: TODAY,
      occasion: 'werk',
      random: noRandom,
    });
    expect(outfit.top?.id).toBe('hoodie');
    expect(outfit.explanation).toContain('hoodie is niet gelabeld voor werk');
  });

  it('houdt een vastgezet stuk vast en bouwt eromheen', () => {
    const anchor = closet.find((i) => i.id === 'pantalon')!;
    for (let i = 0; i < 5; i++) {
      const outfit = suggestOutfit({ items: closet, weather: mild, wearLog: [], date: TODAY, anchor });
      expect(outfit.bottom?.id).toBe('pantalon');
    }
  });

  it('leert van 👎: een afgekeurde combinatie komt niet meer terug', () => {
    const items = [item('shirt', 'shirt', 2), item('jeans', 'broek', 2), item('chino', 'broek', 2)];
    const before = suggestOutfit({ items, weather: mild, wearLog: [], date: TODAY, random: noRandom });
    expect(before.bottom?.id).toBe('jeans');
    const votes = [{ itemIds: ['shirt', 'jeans'], vote: -1 as const, date: TODAY }];
    const after = suggestOutfit({ items, weather: mild, wearLog: [], date: TODAY, votes, random: noRandom });
    expect(after.bottom?.id).toBe('chino');
  });

  it('pairAffinity telt 👍 als bonus en 👎 als straf', () => {
    const affinity = pairAffinity([
      { itemIds: ['a', 'b'], vote: 1, date: TODAY },
      { itemIds: ['b', 'c'], vote: -1, date: TODAY },
    ]);
    expect(affinity.get('a|b')).toBeLessThan(0);
    expect(affinity.get('b|c')).toBeGreaterThan(0);
  });

  it('geeft elke suggestie een harmoniescore', () => {
    const outfit = suggestOutfit({ items: closet, weather: mild, wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.harmony.score).toBe(90); // alles zwart = neutraal
  });
});

describe('laagjes en accessoires', () => {
  const closet: ClothingItem[] = [
    item('wollen trui', 'trui', 4),
    item('t-shirt', 'shirt', 1),
    item('jeans', 'broek', 3),
    item('boots', 'schoenen', 4, { waterproof: true }),
    item('winterjas', 'jas', 5),
    item('sjaal', 'accessoire', 3, { accessoryType: 'sjaal' }),
    item('muts', 'accessoire', 3, { accessoryType: 'muts' }),
    item('zonnebril', 'accessoire', 1, { accessoryType: 'zonnebril' }),
    item('paraplu', 'accessoire', 1, { accessoryType: 'paraplu' }),
    item('tas', 'accessoire', 1, { accessoryType: 'tas' }),
  ];
  const at = (feelsLike: number, extra: Partial<DayWeather> = {}) => ({ ...weather(feelsLike), ...extra });

  it('zet bij kou een shirt onder de trui, en neemt sjaal en muts mee', () => {
    const outfit = suggestOutfit({ items: closet, weather: at(2), wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.top?.id).toBe('wollen trui');
    expect(outfit.layer?.id).toBe('t-shirt');
    expect(outfit.accessories?.map((a) => a.id)).toEqual(['sjaal', 'muts']);
    expect(outfit.explanation).toContain('een warme trui met een shirt eronder');
    expect(outfit.explanation).toContain('Pak ook een sjaal en een muts tegen de kou.');
  });

  it('kiest laagjes als het tussen ochtend en middag flink scheelt', () => {
    const outfit = suggestOutfit({
      items: closet,
      weather: at(10, { feelsLikeMin: 4, feelsLikeMax: 14 }),
      wearLog: [],
      date: TODAY,
      random: noRandom,
    });
    expect(outfit.layer?.id).toBe('t-shirt');
  });

  it('geen laag en geen sjaal bij zacht weer', () => {
    const outfit = suggestOutfit({ items: closet, weather: at(12), wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.layer).toBeUndefined();
    expect(outfit.accessories).toBeUndefined();
  });

  it('zonnebril bij zon en warmte, nooit tas of "anders" vanzelf', () => {
    const outfit = suggestOutfit({
      items: closet,
      weather: at(20, { weatherCode: 0 }),
      wearLog: [],
      date: TODAY,
      random: noRandom,
    });
    expect(outfit.accessories?.map((a) => a.id)).toEqual(['zonnebril']);
    expect(outfit.explanation).toContain('Pak ook een zonnebril tegen de zon.');
  });

  it('paraplu bij regen als de jas niet waterdicht is', () => {
    const outfit = suggestOutfit({ items: closet, weather: at(12, { rainChance: 80 }), wearLog: [], date: TODAY, random: noRandom });
    expect(outfit.accessories?.map((a) => a.id)).toEqual(['paraplu']);
    expect(outfit.explanation).toContain('Pak ook een paraplu voor de regen.');
    expect(outfit.explanation).not.toContain('niet waterdicht');
  });

  it('een vastgezet accessoire komt altijd mee, ook als het weer er niet om vraagt', () => {
    const sjaal = closet.find((i) => i.id === 'sjaal')!;
    const outfit = suggestOutfit({ items: closet, weather: at(18), wearLog: [], date: TODAY, anchor: sjaal, random: noRandom });
    expect(outfit.accessories?.map((a) => a.id)).toEqual(['sjaal']);
    expect(outfit.top).toBeDefined();
    expect(outfit.explanation).toContain('Rond je sjaal gebouwd.');
  });

  it('een vastgezette sjaal vervangt de automatisch gekozen sjaal, niet de muts', () => {
    const extra = [...closet, item('rode sjaal', 'accessoire', 3, { accessoryType: 'sjaal', color: 'rood' })];
    const rood = extra.find((i) => i.id === 'rode sjaal')!;
    const outfit = suggestOutfit({ items: extra, weather: at(2), wearLog: [], date: TODAY, anchor: rood, random: noRandom });
    expect(outfit.accessories?.map((a) => a.id)).toEqual(['rode sjaal', 'muts']);
  });

  it('accessoires en laag tellen mee bij bewaren en terughalen', () => {
    const outfit = suggestOutfit({ items: closet, weather: at(2), wearLog: [], date: TODAY, random: noRandom });
    const ids = piecesToIds(outfit);
    expect(ids.layer).toBe('t-shirt');
    expect(ids.accessories).toEqual(['sjaal', 'muts']);
    const back = resolveSavedOutfit(ids, closet);
    expect(sameOutfit(piecesToIds(back), ids)).toBe(true);
    expect(sameOutfit(ids, { ...ids, accessories: ['muts', 'sjaal'] })).toBe(true); // volgorde telt niet
    expect(sameOutfit(ids, { ...ids, layer: undefined })).toBe(false);
  });
});

describe('bewaarde outfits', () => {
  const saved = { id: 'o1', name: 'Regendag', top: 'wollen trui', bottom: 'jeans', jacket: 'regenjas', createdAt: 0 };

  it('zet ids om naar kledingstukken', () => {
    const pieces = resolveSavedOutfit(saved, wardrobe);
    expect(outfitItems(pieces).map((i) => i.id)).toEqual(['wollen trui', 'jeans', 'regenjas']);
    expect(missingFromSaved(saved, wardrobe)).toBe(0);
  });

  it('slaat verwijderde stukken over', () => {
    const withoutJeans = wardrobe.filter((i) => i.id !== 'jeans');
    const pieces = resolveSavedOutfit(saved, withoutJeans);
    expect(pieces.bottom).toBeUndefined();
    expect(outfitItems(pieces)).toHaveLength(2);
    expect(missingFromSaved(saved, withoutJeans)).toBe(1);
  });
});

describe('hulpfuncties', () => {
  it('wornRecently telt de dag zelf niet mee', () => {
    const log = [{ date: TODAY, itemIds: ['x'] }];
    expect(wornRecently('x', log, TODAY)).toBe(false);
    expect(wornRecently('x', log, addDays(TODAY, 1))).toBe(true);
  });

  it('colorsClash: neutraal past bij alles, twee felle kleuren niet', () => {
    expect(colorsClash(['rood', 'zwart', 'denim'])).toBe(false);
    expect(colorsClash(['rood', 'geel'])).toBe(true);
  });
});
