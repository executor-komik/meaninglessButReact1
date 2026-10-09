# Lesson 4 — `Promise.allSettled` (see every result)

Lesson 3: **`Promise.all`** — one failure → whole thing fails, no array in `try`.

Lesson 4: **`Promise.allSettled`** — wait for **all** to finish (success or fail), then you get a **report** for each.

## Shape of each item

```ts
{ status: 'fulfilled', value: 'Beta' }
{ status: 'rejected', reason: Error }
```

`await Promise.allSettled([...])` **always fulfills** (unless you throw while handling results). Usually **no `catch`** for the batch itself — you loop and decide what to show.

## Your job — `handleRunAllSettled`

Same three calls as Lesson 3 (2s, Alpha/Beta/Gamma, only Alpha uses `simulateError`).

```ts
const outcomes = await Promise.allSettled([
  createDelayedMessage(2000, 'Alpha', simulateError),
  createDelayedMessage(2000, 'Beta', false),
  createDelayedMessage(2000, 'Gamma', false),
]);

const lines = outcomes.map((outcome) => {
  if (outcome.status === 'fulfilled') {
    return outcome.value;
  }
  const reason = outcome.reason;
  const text = reason instanceof Error ? reason.message : String(reason);
  return `FAILED: ${text}`;
});

setLabel(lines.join(' | '));
```

## Try it

| Checkbox | Lesson 3 (`all`) | Lesson 4 (`allSettled`) |
|----------|------------------|-------------------------|
| Off | `Alpha \| Beta \| Gamma` | same |
| On | only error in `catch` | e.g. `FAILED: … \| Beta \| Gamma` |

## Checklist

- [ ] I can say when to use `all` vs `allSettled`
- [ ] Checkbox on still shows **successful** messages for Beta and Gamma

Paste `handleRunAllSettled` when done.
