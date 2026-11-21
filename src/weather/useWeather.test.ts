// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, toDateString } from '../outfit/outfitLogic';
import { fakeHourly, fakeWeatherFetch } from '../test/fakeWeather';
import { summarizeDays } from './openMeteo';
import { useWeather } from './useWeather';

const place = { name: 'Utrecht', latitude: 52.09, longitude: 5.12 };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('kastje.place', JSON.stringify(place));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useWeather', () => {
  it('haalt het weer op en bewaart het voor later', async () => {
    vi.stubGlobal('fetch', vi.fn(fakeWeatherFetch(fakeHourly(7, 12))));
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.days).toHaveLength(7);
    expect(result.current.offline).toBe(false);
    expect(JSON.parse(localStorage.getItem('kastje.weatherCache')!).days).toHaveLength(7);
  });

  it('zonder internet: toont de bewaarde verwachting, zonder dagen die al voorbij zijn', async () => {
    // Verwachting van gisteren: 8 dagen vanaf gisteren
    const yesterdaysForecast = summarizeDays(fakeHourly(8, 9)).map((day, i) => ({
      ...day,
      date: addDays(toDateString(new Date()), i - 1),
    }));
    localStorage.setItem(
      'kastje.weatherCache',
      JSON.stringify({ placeKey: '52.09,5.12', fetchedAt: 123, days: yesterdaysForecast }),
    );
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));

    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.offline).toBe(true);
    expect(result.current.fetchedAt).toBe(123);
    expect(result.current.days![0].date).toBe(toDateString(new Date()));
    expect(result.current.days).toHaveLength(7);
  });

  it('zonder internet en zonder bewaarde verwachting: een duidelijke foutmelding', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.message).toContain('internetverbinding');
  });
});
