# Lesson 3 — `Promise.all` (parallel)

You already `await` **one** Promise. Real apps often need **several** at once (config + user + table, three images, etc.).

## Sequential vs parallel

Each call uses **2000 ms** in the demo.

| Style | Code idea | Wall-clock time (3 calls) |
|-------|-----------|---------------------------|
| **Sequential** | `await a; await b; await c;` | ~**6 s** (2+2+2) |
| **Parallel** | `await Promise.all([a, b, c])` | ~**2 s** (all timers together) |

`Promise.all` starts every Promise **immediately** and finishes when **all** have succeeded. Result is an **array**, same order as you passed in.

If **one** rejects, `Promise.all` **rejects** (jumps to `catch`) — like “all or nothing.”

## Your job in `DelayedMessageDemo.tsx`

Implement **`handleRunParallel`** (stub is there). Use **`async` / `await` / `try` / `catch` / `finally`** like Lesson 2.

### Steps

1. `setLabel('Waiting for 3 in parallel…')` and `setIsRunning(true)`.
2. Inside `try`:

```ts
const results = await Promise.all([
  createDelayedMessage(2000, 'Alpha', simulateError),
  createDelayedMessage(2000, 'Beta', false),
  createDelayedMessage(2000, 'Gamma', false),
]);
setLabel(results.join(' | '));
```

3. `catch` — same safe error text as Lesson 2.
4. `finally` — `setIsRunning(false)`.

### Try it

- Checkbox **off** → after ~**2 s**, label shows `Alpha | Beta | Gamma`.
- Checkbox **on** → first task rejects → `catch` runs (~2 s), no partial label from `all` (failed before success).

### Optional experiment

Add **`handleRunSequential`** with three `await`s in a row (no `Promise.all`). Log `Date.now()` at start/end or use a stopwatch — feel **6 s** vs **2 s**.

## Checklist

- [ ] I can explain why parallel is faster here
- [ ] I know `Promise.all` returns an **array** in the same order
- [ ] I tried checkbox on and saw one failure fail the whole batch

Paste `handleRunParallel` when done.
