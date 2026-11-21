/**
 * Tips op basis van het weer per uur, bijvoorbeeld "Regen vanaf 15:00".
 * De gewone uitleg bij een outfit gaat over de dag als geheel; deze tips vertellen wat er verandert.
 */
import type { DayWeather, HourWeather } from '../types';

/** Vanaf deze kans (%) noemen we een uur "regenachtig". */
const RAIN_LIKELY = 50;
/** Onder deze kans (%) noemen we een uur "droog". */
const RAIN_UNLIKELY = 30;
/** Bij zoveel graden verschil tussen het koudste en warmste uur: laagjes. */
const SWING_DEGREES = 8;
/** Zoveel graden kouder 's avonds dan 's middags: iets warms meenemen. */
const EVENING_DROP = 6;
/** Vanaf deze windsnelheid (km/u) is het "harde wind". */
const STRONG_WIND = 40;
const CALM_WIND = 30;

const time = (h: HourWeather) => `${h.hour}:00`;

/**
 * Tips voor één dag. Met `fromHour` tellen de uren die al voorbij zijn niet mee (handig voor vandaag).
 * Geeft maximaal drie tips, de belangrijkste eerst.
 */
export function weatherTips(day: DayWeather, fromHour = 0): string[] {
  const hours = (day.hours ?? []).filter((h) => h.hour >= fromHour);
  if (hours.length < 2) return [];
  const tips: string[] = [];

  // 1. Eerst droog, later regen.
  const firstRain = hours.findIndex((h) => h.rainChance >= RAIN_LIKELY);
  if (firstRain > 0 && hours.slice(0, firstRain).every((h) => h.rainChance < RAIN_UNLIKELY)) {
    tips.push(`🌧️ Regen vanaf ${time(hours[firstRain])}, neem een paraplu mee.`);
  }

  // 2. Koude ochtend, warme middag: laagjes.
  const coldest = hours.reduce((a, b) => (b.feelsLike < a.feelsLike ? b : a));
  const warmest = hours.reduce((a, b) => (b.feelsLike > a.feelsLike ? b : a));
  if (warmest.feelsLike - coldest.feelsLike >= SWING_DEGREES && coldest.hour < warmest.hour) {
    tips.push(
      `🧥 Koude ochtend (${coldest.feelsLike}°), warme middag (${warmest.feelsLike}°): draag laagjes die je uit kunt doen.`,
    );
  }

  // 3. 's Avonds een stuk kouder dan 's middags.
  const afternoon = hours.filter((h) => h.hour >= 12 && h.hour <= 16);
  const evening = hours.filter((h) => h.hour >= 18);
  if (afternoon.length > 0 && evening.length > 0) {
    const warmAfternoon = Math.max(...afternoon.map((h) => h.feelsLike));
    const coldEvening = Math.min(...evening.map((h) => h.feelsLike));
    if (warmAfternoon - coldEvening >= EVENING_DROP) {
      tips.push(`🌙 's Avonds wordt het een stuk kouder (${coldEvening}°), neem iets warms mee.`);
    }
  }

  // 4. Later op de dag harde wind.
  const firstWind = hours.findIndex((h) => h.windSpeed >= STRONG_WIND);
  if (firstWind > 0 && hours.slice(0, firstWind).every((h) => h.windSpeed < CALM_WIND)) {
    tips.push(`💨 Vanaf ${time(hours[firstWind])} harde wind (${hours[firstWind].windSpeed} km/u).`);
  }

  return tips.slice(0, 3);
}
