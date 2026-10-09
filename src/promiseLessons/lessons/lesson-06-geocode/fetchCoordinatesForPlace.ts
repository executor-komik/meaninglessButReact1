import type { GeocodedPlace } from './geocodeTypes';

/**
 * Lesson 6 — Open‑Meteo geocoding: city name → coordinates.
 * https://open-meteo.com/en/docs/geocoding-api
 */
export async function fetchCoordinatesForPlace(placeName: string): Promise<GeocodedPlace> {
  const urlForPlaceCoords = `https://geocoding-api.open-meteo.com/v1/search?name=${placeName}`;
  const response = await fetch(urlForPlaceCoords);
  const { results } = await response.json();
  if (results.length === 0) {
    throw new Error('No results found for place name: ' + placeName);
  }
  return results[results.length - 1];
}
