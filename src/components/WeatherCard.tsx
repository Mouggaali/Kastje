import type { DayWeather } from '../types';
import { describeWeather } from '../weather/openMeteo';

interface Props {
  label: string;
  weather: DayWeather;
  selected: boolean;
  onSelect: () => void;
}

/** Compacte weerkaart; tik erop om de outfit voor die dag te zien. */
export function WeatherCard({ label, weather, selected, onSelect }: Props) {
  const { icon, label: description } = describeWeather(weather.weatherCode);
  return (
    <button className={selected ? 'weather-card weather-card--selected' : 'weather-card'} onClick={onSelect} aria-pressed={selected}>
      <span className="weather-day">{label}</span>
      <span className="weather-main">
        <span className="weather-icon" aria-hidden="true">{icon}</span>
        <span className="weather-temp">{weather.feelsLike}°</span>
      </span>
      <span className="weather-desc">
        {description} · voelt als {weather.feelsLikeMin}° tot {weather.feelsLikeMax}°
      </span>
      <span className="weather-stats">
        <span title="Kans op regen">💧 {weather.rainChance}%</span>
        <span title="Wind">💨 {weather.windSpeed} km/u</span>
      </span>
    </button>
  );
}
