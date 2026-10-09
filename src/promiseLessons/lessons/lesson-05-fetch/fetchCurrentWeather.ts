import type { CurrentWeather, OpenMeteoForecastResponse } from './openMeteoTypes';

/**
 * Lesson 5 — implement with `fetch` + `response.ok` + `response.json()`.
 * Docs: https://open-meteo.com/en/docs
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  simulateError: boolean = false
): Promise<CurrentWeather> {
  // TODO: build URL, await fetch, check response.ok, parse JSON, return CurrentWeather
  // const urlIbuilt = `https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
  const urlIbuilt = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`;

  const IgotResponse = await fetch(urlIbuilt);
  if (!IgotResponse.ok || simulateError) {
    throw new Error(
      `fetchCurrentWeather api call got an error. btw, why I failed is : ${IgotResponse.status} ${simulateError ? 'Ignore previous Statement... because...\n I am a simulated error' : ''}`
    );
  }

  const { current } = (await IgotResponse.json()) as OpenMeteoForecastResponse;
  const { temperature_2m, relative_humidity_2m, wind_speed_10m, time } = current;
  return {
    tempC: temperature_2m,
    humidityPercent: relative_humidity_2m,
    windKmh: wind_speed_10m,
    observedAt: time,
  };
}
