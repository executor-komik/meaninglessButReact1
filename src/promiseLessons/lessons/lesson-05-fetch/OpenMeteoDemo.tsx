import type { FC, ReactElement } from 'react';
import { useState } from 'react';

import { createDelayedMessage } from '../lesson-01-first-promise/createDelayedMessage';
import { fetchCurrentWeather } from '../lesson-05-fetch/fetchCurrentWeather';
import { fetchCoordinatesForPlace } from '../lesson-06-geocode/fetchCoordinatesForPlace';

import styles from './OpenMeteoDemo.module.css';

/** Delhi — fixed coords for lesson 5; later you can add inputs. */
const DELHI_LAT = 28.6139;
const DELHI_LON = 77.209;

export const OpenMeteoDemo: FC = (): ReactElement => {
  const [label, setLabel] = useState('Lesson 5: Delhi button. Lesson 6: type a city below.');
  const [city, setCity] = useState('Hyderabad');
  const [isLoading, setIsLoading] = useState(false);
  const [simulateError, setSimulateError] = useState(false);

  const handleFetchByCity = async (): Promise<void> => {
    setLabel('Looking up city…');
    setIsLoading(true);

    try {
      // Lesson 6:
      const { latitude, longitude } = await fetchCoordinatesForPlace(city);
      setLabel(`Latitude: ${latitude}, Longitude: ${longitude} \n This is for city: ${city} \n`);

      const delayMessage = await createDelayedMessage(3000, 'I waited 3000ms');
      setLabel(delayMessage);

      const weatherForPlace = await fetchCurrentWeather(latitude, longitude, simulateError);

      const { tempC, humidityPercent, windKmh, observedAt } = weatherForPlace;
      setLabel(
        `all for latitude ${latitude} and longitude ${longitude}: \n Temp: ${tempC} °C\nHumidity: ${humidityPercent}%\nWind: ${windKmh} km/h\nObserved at: ${observedAt}`
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setLabel('Fetch failed:\n' + text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchWeather = async (): Promise<void> => {
    setLabel('Fetching weather…');
    setIsLoading(true);

    try {
      const weather = await fetchCurrentWeather(DELHI_LAT, DELHI_LON, simulateError);
      const { tempC, humidityPercent, windKmh, observedAt } = weather;
      setLabel(
        `all for latitude ${DELHI_LAT} and longitude ${DELHI_LON}: \n Temp: ${tempC} °C\nHumidity: ${humidityPercent}%\nWind: ${windKmh} km/h\nObserved at: ${observedAt}`
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setLabel('Fetch failed:\n' + text);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>Lessons 5–6 — Open‑Meteo</h2>
      <p className={styles.label}>{label}</p>
      <label className={styles.fieldLabel}>
        City (lesson 6)
        <input
          className={styles.textInput}
          type="text"
          value={city}
          disabled={isLoading}
          onChange={(event) => setCity(event.currentTarget.value)}
        />
      </label>
      <label className={styles.checkboxRow}>
        <input
          id="simulateError"
          type="checkbox"
          checked={simulateError}
          disabled={isLoading}
          onChange={(event) => setSimulateError(event.currentTarget.checked)}
        />
        Simulate error (weather step only)
      </label>
      <button type="button" className={styles.button} onClick={handleFetchByCity} disabled={isLoading}>
        Fetch weather for city
      </button>
      <button type="button" className={styles.buttonSecondary} onClick={handleFetchWeather} disabled={isLoading}>
        Lesson 5 — Delhi (fixed coords)
      </button>
    </section>
  );
};
