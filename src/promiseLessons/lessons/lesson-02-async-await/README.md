# Lesson 2 — `async` / `await` + `try` / `catch`

Same button, same `createDelayedMessage` — rewrite `handleRun` without `.then()` / `.catch()`.

## Map from Lesson 1b/1c

| `.then` / `.catch` | `async` / `await` |
|--------------------|-------------------|
| `createDelayedMessage(...)` | `await createDelayedMessage(...)` inside `try` |
| `.then((message) => { ... })` | lines after `await` in `try` |
| `.catch((error) => { ... })` | `catch (error) { ... }` |
| `setIsRunning(false)` in both branches | often `finally { setIsRunning(false) }` once |

## Steps (type yourself in `DelayedMessageDemo.tsx`)

1. Change handler to **`async`** and return type **`Promise<void>`**:
   - `const handleRun = async (): Promise<void> => { ... }`
2. Delete the `.then` / `.catch` chain.
3. After `setLabel('Waiting…')` and `setIsRunning(true)`:

```ts
try {
  const message = await createDelayedMessage(3000, 'Hello Yo..My Promise Ran!', simulateError);
  setLabel(message);
} catch (error) {
  const text = error instanceof Error ? error.message : String(error);
  setLabel('Error came: ' + text);
} finally {
  setIsRunning(false);
}
```

4. Test checkbox off and on — same behaviour as 1c.

## Remember

- `await` **only** works inside an `async` function.
- `await` on a rejected Promise jumps to `catch` (like `.catch`).
- `finally` runs after **both** success and failure — good for “always stop loading.”

Paste `handleRun` in chat when done for review.
