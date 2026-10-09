import { afterEach, describe, expect, test } from 'bun:test';

import { fetchCurrentWeather } from './fetchCurrentWeather';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('lesson 05 — fetchCurrentWeather', () => {
  test('maps Open‑Meteo JSON to CurrentWeather when response is ok', async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            current: {
              time: '2026-09-25T12:00',
              temperature_2m: 31.5,
              relative_humidity_2m: 62,
              wind_speed_10m: 8.2,
            },
          }),
      } as Response);

    const weather = await fetchCurrentWeather(28.61, 77.21);

    expect(weather).toEqual({
      tempC: 31.5,
      humidityPercent: 62,
      windKmh: 8.2,
      observedAt: '2026-09-25T12:00',
    });
  });

  test('throws when response is not ok', async () => {
    globalThis.fetch = () =>
      Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      } as Response);

    await expect(fetchCurrentWeather(0, 0)).rejects.toThrow('503');
  });
});
