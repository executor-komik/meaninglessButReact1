# Promises & async — cheat sheet (mine lessons 1–4)

## States

| State | Meaning |
|-------|---------|
| `pending` | Waiting (timer, network, …) |
| `fulfilled` | Success → `resolve(value)` |
| `rejected` | Failure → `reject(error)` or `throw` in `async` |

---

## Create a Promise (Lesson 1)

```ts
return new Promise((resolve, reject) => {
  setTimeout(() => {
    if (bad) reject(new Error('…'));
    else resolve(data);
  }, ms);
});
```

`setTimeout` = delay. Promise = **deliver result or error to callers later**.

---

## Consume — style A: `.then` / `.catch` (1b / 1c)

```ts
doWork()
  .then((value) => { /* success */ })
  .catch((error) => { /* failure */ });
```

- Next `.then` receives **return value of previous `.then`** (often `undefined`).
- `.catch` **handles** rejection; chain can become “ok” again unless you `throw` again.

---

## Consume — style B: `async` / `await` (Lesson 2)

```ts
async function run() {
  try {
    const value = await doWork();
    // success
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    // failure
  } finally {
    // always (e.g. stop loading spinner)
  }
}
```

- `await` only inside `async`.
- Rejected Promise at `await` → jumps to `catch` (like `.catch`).

---

## Many at once

| API | All succeed | One fails |
|-----|-------------|-----------|
| **Sequential** `await a; await b;` | Sum of times | Stops at first `catch` |
| **`Promise.all([a,b,c])`** | Array of values, **parallel** time ≈ slowest | **Whole thing rejects** → `catch`, no partial array |
| **`Promise.allSettled([a,b,c])`** | Array of outcomes | Still returns array; each item `fulfilled` or `rejected` |

```ts
// all — all or nothing
const values = await Promise.all([p1, p2, p3]);

// allSettled — report card
const outcomes = await Promise.allSettled([p1, p2, p3]);
outcomes.forEach((o) => {
  if (o.status === 'fulfilled') o.value;
  else o.reason;
});
```

---

## Errors in TypeScript

- `catch (error)` is often **`unknown`** → use `instanceof Error` before `.message`.
- `.catch((error) => …)` is sometimes looser (`any`) — same runtime, stricter typing in `catch`.

---

## React button pattern (what you built)

1. Click → `setLoading(true)` + “Waiting…”
2. `await` work (or `.then`)
3. Success → update UI with data
4. Failure → show error
5. `finally` → `setLoading(false)`

---

## Tomorrow: API calling (preview)

- **`fetch(url)`** returns a **Promise** (same mental model).
- **Gotcha:** HTTP **404/503** often still **resolve** `fetch` — you check `response.ok` and may `throw` yourself.
- **WebSocket:** different API, but still async + handlers; connect success/failure feels like resolve/reject.

Same playground: `src/index.tsx` → mine only, `DelayedMessageDemo` or a new `lesson-05-fetch/` component.
