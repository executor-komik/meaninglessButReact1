# Lesson 1 — Your first Promise

**Goal:** Return a value *later* using `new Promise` and `setTimeout`.

You are **not** using `async`/`await` in this file yet. Only a Promise constructor.

## What you will build

`createDelayedMessage(ms, message)` → a `Promise<string>` that:

- waits `ms` milliseconds
- then **resolves** with `message`

## Steps (do these in order)

### 1. Open the stub

Edit `createDelayedMessage.ts`. Replace the `throw` with a `return new Promise(...)`.

### 2. Inside the Promise executor

The executor receives two functions: `resolve` and `reject`.

- Call `setTimeout(() => { ... }, ms)` inside the executor.
- When the timer fires, call `resolve(message)`.

Sketch (do not copy blindly — type it yourself):

```ts
return new Promise((resolve, _reject) => {
  setTimeout(() => {
    resolve(message);
  }, ms);
});
```

### 3. Run the test

```bash
cd games/fortuneroulette
bun test mine/lesson-01-first-promise/createDelayedMessage.test.ts
```

When both tests pass, lesson 1 (code part) is done.

### 4. Experiment (2 minutes)

In a scratch file or the bottom of your file (commented out), try:

- What happens if you call `resolve` twice?
- Change `ms` to `0` — does the test still pass?

### 5. Tell your teacher

Paste your `createDelayedMessage.ts` here in chat (or say “tests pass”) and we’ll add **Lesson 1b**: a small React button that uses your function.

## Checklist

- [ ] I can explain what `pending` → `fulfilled` means for this function
- [ ] I know `resolve` is called *inside* the async work (the timer), not before `setTimeout`
- [ ] `bun test` passes
