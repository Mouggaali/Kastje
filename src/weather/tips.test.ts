import { describe, expect, it } from 'vitest';
import type { DayWeather, HourWeather } from '../types';
import { weatherTips } from './tips';

/** Een dag van 7:00 t/m 21:00, met per uur aan te passen waarden. */
function day(hour: (h: number) => Partial<HourWeather>): DayWeather {
  const hours = Array.from({ length: 15 }, (_, i) => {
    const h = 7 + i;
    return { hour: h, feelsLike: 10, rainChance: 0, windSpeed: 10, ...hour(h) };
  });
  return { date: '2026-11-21', feelsLike: 10, feelsLikeMin: 10, feelsLikeMax: 10, rainChance: 0, windSpeed: 10, weatherCode: 3, hours };
}

describe('weatherTips', () => {
  it('geeft geen tips bij een rustige, gelijkmatige dag', () => {
    expect(weatherTips(day(() => ({})))).toEqual([]);
  });

  it('meldt regen die later op de dag begint', () => {
    const tips = weatherTips(day((h) => ({ rainChance: h >= 15 ? 80 : 10 })));
    expect(tips).toEqual(['🌧️ Regen vanaf 15:00, neem een paraplu mee.']);
  });

  it('geen regentip als het de hele dag al regent', () => {
    expect(weatherTips(day(() => ({ rainChance: 90 })))).toEqual([]);
  });

  it('adviseert laagjes bij een koude ochtend en warme middag', () => {
    const tips = weatherTips(day((h) => ({ feelsLike: h <= 9 ? 3 : h <= 16 ? 13 : 11 })));
    expect(tips[0]).toBe('🧥 Koude ochtend (3°), warme middag (13°): draag laagjes die je uit kunt doen.');
  });

  it("waarschuwt als het 's avonds veel kouder wordt", () => {
    const tips = weatherTips(day((h) => ({ feelsLike: h >= 18 ? 4 : 12 })));
    expect(tips).toContain("🌙 's Avonds wordt het een stuk kouder (4°), neem iets warms mee.");
  });

  it('meldt harde wind die later opsteekt', () => {
    const tips = weatherTips(day((h) => ({ windSpeed: h >= 17 ? 45 : 15 })));
    expect(tips).toEqual(['💨 Vanaf 17:00 harde wind (45 km/u).']);
  });

  it('negeert uren die al voorbij zijn', () => {
    const rainyMorning = day((h) => ({ rainChance: h < 12 ? 0 : h < 15 ? 0 : 80 }));
    expect(weatherTips(rainyMorning, 16)).toEqual([]); // het regent al vanaf het eerste resterende uur
    expect(weatherTips(rainyMorning, 12)).toEqual(['🌧️ Regen vanaf 15:00, neem een paraplu mee.']);
  });

  it('werkt ook met oude gegevens zonder uren', () => {
    const old = { ...day(() => ({})), hours: undefined };
    expect(weatherTips(old)).toEqual([]);
  });
});
