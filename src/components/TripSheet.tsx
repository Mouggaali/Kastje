import { useState, type FormEvent } from 'react';
import { addDays, toDateString } from '../outfit/outfitLogic';
import { packingList } from '../outfit/packing';
import type { ClothingItem, Occasion, Place, Trip } from '../types';
import { describeWeather, fetchWeather, MAX_FORECAST_DAYS, searchPlaces } from '../weather/openMeteo';
import { ItemPhoto } from './ItemPhoto';
import { OutfitCollage } from './OutfitCollage';

interface Props {
  items: ClothingItem[];
  occasion: Occasion | null;
  trip: Trip | null;
  onTripChange: (trip: Trip | null) => void;
  onClose: () => void;
}

/** Langste reis waarvoor we een paklijst maken. */
const MAX_TRIP_DAYS = 14;

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Reis plannen: bestemming en data kiezen, dan het weer daar en een paklijst uit je eigen kast. */
export function TripSheet({ items, occasion, trip, onTripChange, onClose }: Props) {
  const [today] = useState(() => toDateString(new Date()));
  const lastForecastDay = addDays(today, MAX_FORECAST_DAYS - 1);

  // Formulier voor een nieuwe reis
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [start, setStart] = useState(() => addDays(today, 1));
  const [end, setEnd] = useState(() => addDays(today, 4));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      setResults(await searchPlaces(query));
    } catch {
      setError('Zoeken lukt nu niet. Controleer je internetverbinding.');
    }
  }

  async function makeTrip() {
    if (!place) return;
    if (end < start) return setError('De terugreis ligt vóór het vertrek.');
    if (end > lastForecastDay) {
      return setError(
        `Het weer is maar ${MAX_FORECAST_DAYS} dagen vooruit bekend (tot ${shortDate(lastForecastDay)}).`,
      );
    }
    if (addDays(start, MAX_TRIP_DAYS - 1) < end) return setError(`Kies een reis van maximaal ${MAX_TRIP_DAYS} dagen.`);
    setBusy(true);
    setError('');
    try {
      const days = await fetchWeather(place, { start, end });
      onTripChange({ place, start, end, days, packed: [] });
    } catch {
      setError('Het weer op je bestemming kon niet worden opgehaald. Probeer het later nog eens.');
    } finally {
      setBusy(false);
    }
  }

  function togglePacked(id: string) {
    if (!trip) return;
    const packed = trip.packed.includes(id) ? trip.packed.filter((x) => x !== id) : [...trip.packed, id];
    onTripChange({ ...trip, packed });
  }

  const result = trip ? packingList(items, trip.days, occasion) : null;
  const packedCount = result
    ? result.groups.flatMap((g) => g.entries).filter((e) => trip!.packed.includes(e.item.id)).length
    : 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>🧳 {trip ? `Naar ${trip.place.name.split(',')[0]}` : 'Reis plannen'}</h2>

        {!trip && (
          <>
            <p className="muted">
              Kies je bestemming en data. Ik haal het weer daar op en maak een paklijst uit je eigen kast. Het weer is
              tot {MAX_FORECAST_DAYS} dagen vooruit bekend.
            </p>

            {place ? (
              <div className="anchor-chip">
                📍 <strong>{place.name}</strong>
                <button className="link-button" onClick={() => setPlace(null)}>
                  wijzig
                </button>
              </div>
            ) : (
              <>
                <form className="search-row" onSubmit={handleSearch}>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Waar ga je heen?"
                    aria-label="Bestemming"
                  />
                  <button className="button" disabled={query.trim().length < 2}>
                    Zoek
                  </button>
                </form>
                {results && results.length === 0 && <p className="muted">Geen plaatsen gevonden.</p>}
                {results && results.length > 0 && (
                  <ul className="place-list">
                    {results.map((p) => (
                      <li key={`${p.latitude},${p.longitude}`}>
                        <button onClick={() => setPlace(p)}>📍 {p.name}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="date-row">
              <label className="field">
                <span>Vertrek</span>
                <input
                  type="date"
                  value={start}
                  min={today}
                  max={lastForecastDay}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Terug</span>
                <input
                  type="date"
                  value={end}
                  min={start}
                  max={lastForecastDay}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>

            {error && <p className="error">{error}</p>}
          </>
        )}

        {trip && result && (
          <>
            <p className="muted">
              {shortDate(trip.start)} t/m {shortDate(trip.end)} · {trip.days.length} dagen · {result.count} stuks mee
            </p>

            <div className="field">
              <span>
                Paklijst ({packedCount} van {result.count} ingepakt)
              </span>
              {result.groups.map((group) => (
                <div key={group.category} className="pack-group">
                  <h3>{group.label}</h3>
                  <ul className="pack-list">
                    {group.entries.map(({ item, dates }) => {
                      const packed = trip.packed.includes(item.id);
                      return (
                        <li key={item.id}>
                          <label className={packed ? 'pack-item pack-item--done' : 'pack-item'}>
                            <input type="checkbox" checked={packed} onChange={() => togglePacked(item.id)} />
                            <ItemPhoto item={item} small />
                            <span className="rank-text">
                              <span className="item-name">{item.name}</span>
                              <span className="item-meta">
                                {dates.length === trip.days.length ? 'elke dag' : `${dates.length}× nodig`}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="field">
              <span>Per dag</span>
              <ul className="plan-list">
                {result.days.map(({ weather, outfit }) => {
                  const { icon, label } = describeWeather(weather.weatherCode);
                  return (
                    <li key={weather.date} className="trip-day">
                      <strong>{weather.date === today ? 'Vandaag' : shortDate(weather.date)}</strong>
                      <span className="muted">
                        {icon} {weather.feelsLike}° · {label.toLowerCase()} · 💧 {weather.rainChance}%
                      </span>
                      <OutfitCollage pieces={outfit} compact />
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        <div className="sheet-actions">
          {trip && (
            <button
              type="button"
              className="button button--danger"
              onClick={() => {
                if (window.confirm('Deze reis en je paklijst wissen?')) onTripChange(null);
              }}
            >
              Reis wissen
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button button--ghost" onClick={onClose}>
            Sluiten
          </button>
          {!trip && (
            <button type="button" className="button" disabled={!place || busy} onClick={makeTrip}>
              {busy ? 'Bezig…' : 'Paklijst maken'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
