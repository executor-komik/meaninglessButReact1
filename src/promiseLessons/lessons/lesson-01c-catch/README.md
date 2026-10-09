# Lesson 1c — `.catch()` when the Promise rejects

`createDelayedMessage(ms, message, shouldFail?)` — third argument `true` → `reject` after the delay.

## Your job in `DelayedMessageDemo.tsx`

Extend the same `handleRun` chain:

1. Pass `simulateError` into `createDelayedMessage(..., simulateError)`.
2. Keep `.then()` for success (unchanged idea).
3. Add **`.catch((error) => { ... })`** after `.then`:
   - `setLabel(error.message)` (or a friendly string)
   - `setIsRunning(false)` — **always** on failure, or the button stays disabled.

## Try it

- Checkbox **off** → success path (`.then`).
- Checkbox **on** → failure path (`.catch`).

```bash
bun test mine/lesson-01-first-promise/createDelayedMessage.test.ts
```
