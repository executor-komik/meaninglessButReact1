# Lesson 1b — Promise in a React button (`.then()`)

**Goal:** Call your `createDelayedMessage` from a button and update the UI when the Promise fulfills.

You already built the Promise in `mine/lesson-01-first-promise/`. This lesson is only about **using** it in React with **`.then()`** — not `async`/`await` on the click handler yet (that’s Lesson 2).

## Files

| File | Your job |
|------|----------|
| `DelayedMessageDemo.tsx` | Fill in `handleRun` |
| `../../index.tsx` | Calls `renderMinePlayground()`; game startup commented out |

## Steps

### 0. Mine-only dev

Use `bun run start` and open `http://localhost:8080/` — only the mine page (see `src/mine/README.md`).

### 1. Implement `handleRun`

Open `DelayedMessageDemo.tsx`. Inside `handleRun`:

1. `setIsRunning(true)` so the button disables.
2. `setLabel('Waiting…')` (or similar).
3. Call `createDelayedMessage(1500, 'Hello from your Promise!')`.
4. On the returned Promise, chain **`.then((message) => { ... })`**:
   - `setLabel(message)`
   - `setIsRunning(false)`

Sketch (type it yourself):

```ts
setIsRunning(true);
setLabel('Waiting…');

createDelayedMessage(1500, 'Hello from your Promise!').then((message) => {
  setLabel(message);
  setIsRunning(false);
});
```

**Why `.then` here?** Same Promise you wrote in Lesson 1 — React doesn’t get the string until the timer fires. `.then` is “when the Promise succeeds, run this.”

### 2. Run the playground

From `games/fortuneroulette`:

```bash
bun run start
```

Open the dev URL (simple page titled “Mine — promise lessons”).

### 3. Click and watch

- Label should jump to **Waiting…** immediately.
- After **~1.5s**, it should show **Hello from your Promise!**
- Button should stay disabled only while waiting.

### 4. Tell your teacher

Reply with “1b works” or paste your `handleRun`. We’ll review, then Lesson 2 rewrites the same flow with `async`/`await`.

## Checklist

- [ ] I used `.then()` (not `async` on `handleRun` yet)
- [ ] UI updates twice: waiting → final message
- [ ] Button disabled while the Promise is in flight
- [ ] Know how to restore the game block in `src/index.tsx` when you need the table again
