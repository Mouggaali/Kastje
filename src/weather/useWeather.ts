import { useCallback, useEffect, useState } from 'react';
import { loadPlace, savePlace } from '../data/storage';
import type { DayWeather, Place } from '../types';
import { fetchWeather, getBrowserLocation } from './openMeteo';

export type WeatherStatus = 'locating' | 'loading' | 'ready' | 'error' | 'needs-place';

export interface WeatherState {
  place: Place | null;
  /** Vandaag + 6 dagen */
  days: DayWeather[] | null;
  status: WeatherStatus;
  message: string;
  choosePlace: (place: Place) => void;
  useMyLocation: () => void;
  retry: () => void;
}

/** Plaats en weer op één plek, zodat Vandaag en Plannen dezelfde gegevens gebruiken. */
export function useWeather(): WeatherState {
  const [place, setPlace] = useState<Place | null>(loadPlace);
  const [days, setDays] = useState<DayWeather[] | null>(null);
  const [status, setStatus] = useState<WeatherStatus>(place ? 'loading' : 'locating');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const choosePlace = useCallback((newPlace: Place) => {
    savePlace(newPlace);
    setPlace(newPlace);
    setMessage('');
  }, []);

  const useMyLocation = useCallback(() => {
    setStatus('locating');
    getBrowserLocation()
      .then(choosePlace)
      .catch((error: Error) => {
        setMessage(error.message);
        setStatus('needs-place');
      });
  }, [choosePlace]);

  // Eerste keer: nog geen plaats bekend, dus vraag de browserlocatie.
  useEffect(() => {
    if (!place) useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Weer ophalen zodra de plaats bekend is (of na "Opnieuw proberen").
  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    setStatus('loading');
    fetchWeather(place)
      .then((result) => {
        if (cancelled) return;
        setDays(result);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setMessage('Het weer kon niet worden opgehaald. Controleer je internetverbinding.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [place, reloadKey]);

  return {
    place,
    days,
    status,
    message,
    choosePlace,
    useMyLocation,
    retry: () => setReloadKey((k) => k + 1),
  };
}
