# Lesson 6 — Geocode a city → lat / lon (Open‑Meteo)

**Docs:** https://open-meteo.com/en/docs/geocoding-api

Example:

`https://geocoding-api.open-meteo.com/v1/search?name=Hyderabad&count=1`

JSON (simplified):

```json
{
  "results": [
    { "name": "Hyderabad", "latitude": 17.39, "longitude": 78.49, "country": "India" }
  ]
}
```

## Part A — `fetchCoordinatesForPlace.ts` (you code)

1. `new URL('https://geocoding-api.open-meteo.com/v1/search')`
2. `searchParams.set('name', placeName.trim())`, `count` = `1`
3. `await fetch` → check `response.ok` → `await response.json()`
4. If `!data.results?.length` → `throw new Error('No place found for …')`
5. Return `{ name, latitude, longitude, country }` from `results[0]`

Test:

```bash
bun test mine/lesson-06-geocode/fetchCoordinatesForPlace.test.ts
```

## Part B — `OpenMeteoDemo.tsx` (you code)

1. Text input + state: `city` (default e.g. `Hyderabad`).
2. New handler **`handleFetchByCity`** (keep Delhi button if you like):
   - `setLabel('Looking up city…')`
   - `const place = await fetchCoordinatesForPlace(city)`
   - `const weather = await fetchCurrentWeather(place.latitude, place.longitude, simulateError)`
   - Label shows **place name + coords + weather** (multi-line).
3. Same `try` / `catch` / `finally` as Lesson 5.

**Flow:** two `fetch`es in one `async` function — **geocode first**, then **weather** (sequential, not `Promise.all`, because step 2 needs step 1’s coords).

Paste Part A + `handleFetchByCity` when done.
