# Lesson 5 — `fetch` + Open‑Meteo

**API:** [Open‑Meteo](https://open-meteo.com/) — free, no API key, works from the browser.

Example (Delhi):

`https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,relative_humidity_2m,wind_speed_10m`

## Part A — `fetchCurrentWeather.ts` (you code)

File: `mine/lesson-05-fetch/fetchCurrentWeather.ts`

1. Build the URL with `new URL('https://api.open-meteo.com/v1/forecast')` and `searchParams.set(...)` for:
   - `latitude`, `longitude`
   - `current` = `temperature_2m,relative_humidity_2m,wind_speed_10m`
2. `const response = await fetch(url);`
3. **Important:** if `!response.ok`, `throw new Error(...)` with `response.status` (fetch does **not** throw on 404/503).
4. `const data = await response.json();` — shape in `openMeteoTypes.ts`
5. Return `{ temp, humidity, wind }` from `data.current`.

Run logic check (optional):

```bash
bun test mine/lesson-05-fetch/fetchCurrentWeather.test.ts
```

## Part B — `OpenMeteoDemo.tsx` (you code)

Same pattern as Lesson 2:

- `loading` / label state
- `async` handler → `await fetchCurrentWeather(28.6139, 77.2090)` (Delhi)
- `try` / `catch` / `finally`
- Show temp, humidity, wind in the label (multi-line + `white-space: pre-line` on CSS)

## Mental model

| Your lessons | `fetch` |
|--------------|---------|
| `createDelayedMessage` | `fetch(url)` returns a Promise |
| `resolve` with string | `response.ok` + `response.json()` |
| `reject` | network error **or** you `throw` when `!response.ok` |

Paste `fetchCurrentWeather` + `handleFetch` when done for review.
