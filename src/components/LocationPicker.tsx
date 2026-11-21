import { useState, type FormEvent } from 'react';
import type { Place } from '../types';
import { searchPlaces } from '../weather/openMeteo';

interface Props {
  message?: string;
  onPick: (place: Place) => void;
  onUseMyLocation: () => void;
  onCancel?: () => void;
}

/** Plaats zoeken als terugval wanneer de browserlocatie niet werkt. */
export function LocationPicker({ message, onPick, onUseMyLocation, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError('');
    try {
      setResults(await searchPlaces(query));
    } catch {
      setError('Zoeken lukt nu niet. Controleer je internetverbinding.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="card location-picker">
      <h2>Waar ben je?</h2>
      {message && <p className="muted">{message}</p>}
      <form className="search-row" onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek je woonplaats"
          aria-label="Plaats"
        />
        <button className="button" disabled={searching || query.trim().length < 2}>
          {searching ? 'Zoeken…' : 'Zoek'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {results && results.length === 0 && <p className="muted">Geen plaatsen gevonden.</p>}
      {results && results.length > 0 && (
        <ul className="place-list">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude}`}>
              <button onClick={() => onPick(place)}>📍 {place.name}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button className="button button--ghost" onClick={onUseMyLocation}>
          Gebruik mijn locatie
        </button>
        {onCancel && (
          <button className="button button--ghost" onClick={onCancel}>
            Annuleren
          </button>
        )}
      </div>
    </div>
  );
}
