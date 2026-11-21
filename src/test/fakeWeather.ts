// Nagemaakt weer voor tests: een Open-Meteo-antwoord voor een aantal dagen vanaf vandaag.
import { addDays, toDateString } from '../outfit/outfitLogic';
import type { HourlyData } from '../weather/openMeteo';

export function fakeHourly(days = 7, feelsLike = 6, rainChance = 0): HourlyData {
  const today = toDateString(new Date());
  const data: HourlyData = {
    time: [],
    apparent_temperature: [],
    precipitation_probability: [],
    wind_speed_10m: [],
    weather_code: [],
  };
  for (let d = 0; d < days; d++) {
    const date = addDays(today, d);
    for (let h = 0; h < 24; h++) {
      data.time.push(`${date}T${String(h).padStart(2, '0')}:00`);
      data.apparent_temperature.push(feelsLike);
      data.precipitation_probability.push(rainChance);
      data.wind_speed_10m.push(10);
      data.weather_code.push(3);
    }
  }
  return data;
}

/** Een nep-`fetch` die op elke weervraag dit weer teruggeeft. */
export function fakeWeatherFetch(hourly: HourlyData) {
  return async () => ({ ok: true, status: 200, json: async () => ({ hourly }) }) as Response;
}
