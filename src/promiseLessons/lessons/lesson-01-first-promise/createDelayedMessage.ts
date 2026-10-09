/**
 * Lesson 01 / 1c — `new Promise` + `setTimeout`.
 * Optional `shouldFail` rejects after the delay (for `.catch()` practice).
 * Do not use async/await in this file yet.
 */
export function createDelayedMessage(ms: number, message: string, shouldFail = false): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Simulated failure (like a 503 in your head).'));
      } else {
        resolve(message);
      }
    }, ms);
  });
}
