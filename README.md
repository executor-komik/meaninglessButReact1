# Execute

A small React + TypeScript playground for useful actions, animated experiments, and a little frontend whimsy.

## Local development

```bash
npm install
npm run dev
```

Before publishing, verify the project with:

```bash
npm run lint
npm run build
```

## GitHub Pages deployment

This repository is configured to deploy automatically from the `meaninglessReact1` branch using GitHub Actions.

1. Push the workflow and application changes to GitHub.
2. Open the repository on GitHub.
3. Go to **Settings > Pages**.
4. Set **Source** to **GitHub Actions**.
5. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.

The site URL will be:

`https://bentennyson-5.github.io/Execute/`

The Vite base path and SPA fallback are configured for this repository, including the `/noice` route.
