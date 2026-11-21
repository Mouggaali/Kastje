// Weer en plaatsen zoeken via Open-Meteo (gratis, geen API-key nodig).
// Alleen je coördinaten of zoekterm gaan naar Open-Meteo; je kledingkast blijft op je apparaat.
import type { DayWeather, Place } from '../types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Overdag = de uren waarin je de outfit draagt. */
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;

export interface HourlyData {
  time: string[];
  apparent_temperature: number[];
  precipitation_probability: (number | null)[];
  wind_speed_10m: number[];
  weather_code: number[];
}

/** Haalt het weer op voor vandaag en de 6 dagen erna (voor de weekplanner). */
export async function fetchWeather(place: Place, days = 7): Promise<DayWeather[]> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    hourly: 'apparent_temperature,precipitation_probability,wind_speed_10m,weather_code',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: String(days),
  });
  const response = await fetch(`${FORECAST_URL}?${params}`);
  if (!response.ok) throw new Error(`Open-Meteo gaf fout ${response.status}`);
  const data = (await response.json()) as { hourly: HourlyData };
  return summarizeDays(data.hourly);
}

/** Vat de uurlijkse gegevens per dag samen (alleen de uren overdag). */
export function summarizeDays(hourly: HourlyData): DayWeather[] {
  const hoursPerDay = new Map<string, number[]>();
  hourly.time.forEach((time, index) => {
    const hour = Number(time.slice(11, 13));
    if (hour < DAY_START_HOUR || hour > DAY_END_HOUR) return;
    const date = time.slice(0, 10);
    hoursPerDay.set(date, [...(hoursPerDay.get(date) ?? []), index]);
  });

  return [...hoursPerDay].map(([date, indexes]) => {
    const temps = indexes.map((i) => hourly.apparent_temperature[i]);
    const average = temps.reduce((sum, t) => sum + t, 0) / temps.length;
    return {
      date,
      feelsLike: Math.round(average),
      feelsLikeMin: Math.round(Math.min(...temps)),
      feelsLikeMax: Math.round(Math.max(...temps)),
      rainChance: Math.max(...indexes.map((i) => hourly.precipitation_probability[i] ?? 0)),
      windSpeed: Math.round(Math.max(...indexes.map((i) => hourly.wind_speed_10m[i]))),
      weatherCode: Math.max(...indexes.map((i) => hourly.weather_code[i])),
    };
  });
}

/** Zoekt plaatsen op naam, bijvoorbeeld "Utrecht". */
export async function searchPlaces(query: string): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const params = new URLSearchParams({ name: query.trim(), count: '5', language: 'nl', format: 'json' });
  const response = await fetch(`${GEOCODING_URL}?${params}`);
  if (!response.ok) throw new Error(`Open-Meteo gaf fout ${response.status}`);
  const data = (await response.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };
  return (data.results ?? []).map((r) => ({
    // "Utrecht, Utrecht, Nederland" → "Utrecht, Nederland"
    name: [...new Set([r.name, r.admin1, r.country].filter(Boolean))].join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/** Vraagt de locatie aan de browser. Afgerond op ~1 km, meer is niet nodig voor het weer. */
export function getBrowserLocation(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Je browser kan je locatie niet bepalen. Zoek je woonplaats hieronder.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          name: 'Huidige locatie',
          latitude: Math.round(position.coords.latitude * 100) / 100,
          longitude: Math.round(position.coords.longitude * 100) / 100,
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'Je hebt geen toestemming gegeven voor je locatie. Zoek je woonplaats hieronder.'
              : 'Je locatie kon niet worden bepaald. Zoek je woonplaats hieronder.',
          ),
        ),
      { timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

/** Korte omschrijving en icoon bij een WMO-weercode. */
export function describeWeather(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Zonnig', icon: '☀️' };
  if (code <= 2) return { label: 'Licht bewolkt', icon: '🌤️' };
  if (code === 3) return { label: 'Bewolkt', icon: '☁️' };
  if (code <= 48) return { label: 'Mist', icon: '🌫️' };
  if (code <= 57) return { label: 'Motregen', icon: '🌦️' };
  if (code <= 67) return { label: 'Regen', icon: '🌧️' };
  if (code <= 77) return { label: 'Sneeuw', icon: '🌨️' };
  if (code <= 82) return { label: 'Buien', icon: '🌦️' };
  if (code <= 86) return { label: 'Sneeuwbuien', icon: '🌨️' };
  return { label: 'Onweer', icon: '⛈️' };
}
