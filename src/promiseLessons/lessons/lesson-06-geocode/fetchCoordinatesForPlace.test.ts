import { afterEach, describe, expect, test } from 'bun:test';

import { fetchCoordinatesForPlace } from './fetchCoordinatesForPlace';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('lesson 06 — fetchCoordinatesForPlace', () => {
  test('returns first result when API responds with results', async () => {
    globalThis.fetch = (): Promise<Response> =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            results: [{ name: 'Hyderabad', latitude: 17.39, longitude: 78.49, country: 'India' }],
          }),
      } as Response);

    const place = await fetchCoordinatesForPlace('Hyderabad');

    expect(place).toEqual({
      name: 'Hyderabad',
      latitude: 17.39,
      longitude: 78.49,
      country: 'India',
    });
  });

  test('throws when no results', async () => {
    globalThis.fetch = (): Promise<Response> =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      } as Response);

    let caught: unknown;

    try {
      await fetchCoordinatesForPlace('xyznotacity');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('No results found for place name: xyznotacity');
  });
});
