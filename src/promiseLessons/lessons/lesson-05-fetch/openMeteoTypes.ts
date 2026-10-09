/** Minimal slice of Open‑Meteo forecast JSON (see API docs). */
export type OpenMeteoForecastResponse = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
};

export type CurrentWeather = {
  tempC: number;
  humidityPercent: number;
  windKmh: number;
  observedAt: string;
};
