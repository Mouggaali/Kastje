import { describe, expect, it } from 'vitest';
import { describeWeather, summarizeDays, type HourlyData } from './openMeteo';

/** Maakt 24 uur aan testgegevens voor één datum. */
function day(date: string, temp: (hour: number) => number, rain: (hour: number) => number): HourlyData {
  const hours = [...Array(24).keys()];
  return {
    time: hours.map((h) => `${date}T${String(h).padStart(2, '0')}:00`),
    apparent_temperature: hours.map(temp),
    precipitation_probability: hours.map(rain),
    wind_speed_10m: hours.map((h) => (h === 3 ? 90 : 10 + h)),
    weather_code: hours.map((h) => (h === 12 ? 61 : 3)),
  };
}

function merge(a: HourlyData, b: HourlyData): HourlyData {
  return {
    time: [...a.time, ...b.time],
    apparent_temperature: [...a.apparent_temperature, ...b.apparent_temperature],
    precipitation_probability: [...a.precipitation_probability, ...b.precipitation_probability],
    wind_speed_10m: [...a.wind_speed_10m, ...b.wind_speed_10m],
    weather_code: [...a.weather_code, ...b.weather_code],
  };
}

describe('summarizeDays', () => {
  const data = merge(
    day('2026-11-19', (h) => (h < 7 ? -10 : 8), (h) => (h === 2 ? 100 : 20)),
    day('2026-11-20', () => 15, (h) => (h === 14 ? 80 : 0)),
  );
  const [today, tomorrow] = summarizeDays(data);

  it('maakt één samenvatting per dag', () => {
    expect(summarizeDays(data).map((d) => d.date)).toEqual(['2026-11-19', '2026-11-20']);
  });

  it('kijkt alleen naar de uren overdag (7:00–21:00)', () => {
    expect(today.feelsLike).toBe(8); // de koude nacht telt niet mee
    expect(today.rainChance).toBe(20); // de regen om 2:00 telt niet mee
    expect(today.windSpeed).toBe(31); // hoogste wind om 21:00 (10 + 21), niet de 90 om 3:00
  });

  it('neemt de hoogste regenkans en het zwaarste weertype', () => {
    expect(tomorrow.rainChance).toBe(80);
    expect(tomorrow.weatherCode).toBe(61);
  });
});

describe('describeWeather', () => {
  it('geeft een Nederlandse omschrijving', () => {
    expect(describeWeather(0).label).toBe('Zonnig');
    expect(describeWeather(63).label).toBe('Regen');
  });
});
