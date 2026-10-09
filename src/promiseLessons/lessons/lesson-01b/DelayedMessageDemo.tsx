import type { FC, ReactElement } from 'react';
import { useState } from 'react';

import { createDelayedMessage } from '../lesson-01-first-promise/createDelayedMessage';

import styles from './DelayedMessageDemo.module.css';

export const DelayedMessageDemo: FC = (): ReactElement => {
  const [label, setLabel] = useState('Let us see what is up!!');
  const [isRunning, setIsRunning] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [simulateError2, setSimulateError2] = useState(false);
  const [simulateError3, setSimulateError3] = useState(false);

  const handleRun = (): void => {
    setLabel('Waiting…');
    setIsRunning(true);

    const promiseThatIgot = createDelayedMessage(3000, 'Hello Yo..My Promise Ran!', simulateError);

    promiseThatIgot
      .then((message) => {
        setLabel(message);
        setIsRunning(false);
        return 'for then 2';
      })
      .then((message) => {
        console.log('||what message lol.. tell again ??', message);
      })
      .catch((error) => {
        setLabel('Error came: ' + error.message);
        setIsRunning(false);
        throw new Error('for catch 2');
      })
      .catch((error) => {
        console.log('||what error lol.. tell again ??', error.message);
      });
  };

  const handleRunAsync = async (): Promise<void> => {
    setLabel('Waiting…');
    setIsRunning(true);

    try {
      const incomingMessage = await createDelayedMessage(3000, 'Hello Yo..My Promise Ran!', simulateError);
      setLabel(incomingMessage);
    } catch (error) {
      setLabel((error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  console.log('##handleRun', handleRun);
  console.log('#handleRunAsync', handleRunAsync);

  const handleRunParallel = async (): Promise<void> => {
    // Lesson 3 — Promise.all (see mine/lesson-03-promise-all/README.md)
    setLabel('Waiting for 3 in parallel…');
    setIsRunning(true);

    try {
      const results = await Promise.all([
        createDelayedMessage(2000, 'Alpha', simulateError),
        createDelayedMessage(2000, 'Beta', false),
        createDelayedMessage(2000, 'Gamma', false),
      ]);
      setLabel(results.join(' |||||| '));
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setLabel('I got an error in one of the promises: ' + text);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunAllSettled = async (): Promise<void> => {
    // Lesson 4 — Promise.allSettled (see mine/lesson-04-all-settled/README.md)
    setLabel('Waiting for 3 (allSettled)…');
    setIsRunning(true);

    try {
      // const outcomes = await Promise.allSettled([ ... same 3 as lesson 3 ... ]);
      // map outcomes → lines (fulfilled → value, rejected → `FAILED: ...`)
      // setLabel(lines.join(' | '));
      const allOutComes = await Promise.allSettled([
        createDelayedMessage(2000, 'Alpha', simulateError),
        createDelayedMessage(2000, 'Beta', simulateError2),
        createDelayedMessage(2000, 'Gamma', simulateError3),
      ]);

      const getLinesToShow = allOutComes.map((outcome, index) => {
        return (
          ' I am outcome ' +
          index +
          ' and my status is ' +
          outcome.status +
          ' with ' +
          (outcome.status === 'fulfilled' ? 'value ' + outcome.value : 'reason ' + outcome.reason)
        );
      });

      setLabel(getLinesToShow.join('\n'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={styles.root}>
      <p className={styles.label}>{label}</p>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={simulateError}
          disabled={isRunning}
          onChange={(event) => setSimulateError(event.currentTarget.checked)}
        />
        Simulate failure (reject)
      </label>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={simulateError2}
          disabled={isRunning}
          onChange={(event) => setSimulateError2(event.currentTarget.checked)}
        />
        Simulate failure (reject) 2
      </label>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={simulateError3}
          disabled={isRunning}
          onChange={(event) => setSimulateError3(event.currentTarget.checked)}
        />
        Simulate failure (reject) 3
      </label>
      <button type="button" className={styles.button} onClick={handleRun} disabled={isRunning}>
        Lesson 1 — one message
      </button>
      <button type="button" className={styles.button} onClick={handleRunAsync} disabled={isRunning}>
        Lesson 2 — one message async
      </button>
      <button type="button" className={styles.button} onClick={handleRunParallel} disabled={isRunning}>
        Lesson 3 — Promise.all
      </button>
      <button type="button" className={styles.button} onClick={handleRunAllSettled} disabled={isRunning}>
        Lesson 4 — allSettled
      </button>
    </div>
  );
};
