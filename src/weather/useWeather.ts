import { useCallback, useEffect, useState } from 'react';
import { loadPlace, loadWeatherCache, savePlace, saveWeatherCache } from '../data/storage';
import { toDateString } from '../outfit/outfitLogic';
import type { DayWeather, Place } from '../types';
import { fetchWeather, getBrowserLocation } from './openMeteo';

export type WeatherStatus = 'locating' | 'loading' | 'ready' | 'error' | 'needs-place';

export interface WeatherState {
  place: Place | null;
  /** Vandaag + 6 dagen */
  days: DayWeather[] | null;
  status: WeatherStatus;
  message: string;
  /** true als we geen verbinding hebben en de laatst bewaarde verwachting tonen */
  offline: boolean;
  /** Wanneer de getoonde verwachting is opgehaald (ms) */
  fetchedAt: number | null;
  choosePlace: (place: Place) => void;
  locateMe: () => void;
  retry: () => void;
}

/** Uitkomst van één keer ophalen, voor één plaats. */
type FetchResult =
  | { key: string; days: DayWeather[]; fetchedAt: number; offline: boolean }
  | { key: string; error: string };

const placeKey = (place: Place) => `${place.latitude},${place.longitude}`;

/** Laatst bewaarde verwachting voor deze plaats, zonder de dagen die al voorbij zijn. */
function cachedFor(place: Place) {
  const cache = loadWeatherCache();
  if (!cache || cache.placeKey !== placeKey(place)) return null;
  const today = toDateString(new Date());
  const days = cache.days.filter((d) => d.date >= today);
  return days.length > 0 ? { days, fetchedAt: cache.fetchedAt } : null;
}

/** Plaats en weer op één plek, zodat Vandaag en Plannen dezelfde gegevens gebruiken. */
export function useWeather(): WeatherState {
  const [place, setPlace] = useState<Place | null>(loadPlace);
  const [locating, setLocating] = useState(!place);
  const [locateError, setLocateError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<FetchResult | null>(null);

  const choosePlace = useCallback((newPlace: Place) => {
    savePlace(newPlace);
    setPlace(newPlace);
    setLocating(false);
    setLocateError('');
  }, []);

  const failLocate = useCallback((error: Error) => {
    setLocating(false);
    setLocateError(error.message);
  }, []);

  /** Knop "Gebruik mijn locatie". */
  const locateMe = useCallback(() => {
    setLocating(true);
    getBrowserLocation().then(choosePlace).catch(failLocate);
  }, [choosePlace, failLocate]);

  // Eerste keer: nog geen plaats bekend, dus vraag de browserlocatie.
  useEffect(() => {
    if (place) return;
    getBrowserLocation().then(choosePlace).catch(failLocate);
  }, [place, choosePlace, failLocate]);

  // Weer ophalen zodra de plaats bekend is (of na "Opnieuw proberen").
  const currentKey = place ? `${placeKey(place)}#${reloadKey}` : null;
  useEffect(() => {
    if (!place || !currentKey) return;
    let cancelled = false;
    fetchWeather(place)
      .then((days) => {
        if (cancelled) return;
        const fetchedAt = Date.now();
        saveWeatherCache({ placeKey: placeKey(place), fetchedAt, days });
        setResult({ key: currentKey, days, fetchedAt, offline: false });
      })
      .catch(() => {
        if (cancelled) return;
        // Geen verbinding? Dan de laatst bewaarde verwachting, als die er is.
        const cached = cachedFor(place);
        setResult(
          cached
            ? { key: currentKey, ...cached, offline: true }
            : { key: currentKey, error: 'Het weer kon niet worden opgehaald. Controleer je internetverbinding.' },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [place, currentKey]);

  // De status volgt uit wat we weten, in plaats van hem los bij te houden.
  const current = result && result.key === currentKey ? result : null;
  let status: WeatherStatus;
  if (!place) status = locating ? 'locating' : 'needs-place';
  else if (!current) status = 'loading';
  else status = 'error' in current ? 'error' : 'ready';

  const ready = current && !('error' in current) ? current : null;
  return {
    place,
    days: ready?.days ?? null,
    status,
    message: current && 'error' in current ? current.error : locateError,
    offline: ready?.offline ?? false,
    fetchedAt: ready?.fetchedAt ?? null,
    choosePlace,
    locateMe,
    retry: () => setReloadKey((k) => k + 1),
  };
}
