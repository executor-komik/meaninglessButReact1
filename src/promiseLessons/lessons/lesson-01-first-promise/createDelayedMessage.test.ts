import { describe, expect, test } from 'bun:test';

import { createDelayedMessage } from './createDelayedMessage';

describe('lesson 01 — createDelayedMessage', () => {
  test('resolves with the message after the delay', async () => {
    const message = await createDelayedMessage(30, 'hello from the future');
    expect(message).toBe('hello from the future');
  });

  test('returns a Promise (thenable)', () => {
    const result = createDelayedMessage(10, 'x');
    expect(result).toBeInstanceOf(Promise);
  });

  test('rejects when shouldFail is true', async () => {
    await expect(createDelayedMessage(10, 'ignored', true)).rejects.toThrow('Simulated failure');
  });
});
