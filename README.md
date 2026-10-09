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

`https://executor-komik.github.io/meaninglessButReact1/`

The Vite base path and SPA fallback are configured for this repository, including the `/noice` route.

## Capital gains calculator

Choose **Advanced Calculator** on the dashboard to open `/needHelp`. Enter purchase
and sale transactions with investment name/type, date, quantity, and total amount,
then press **Calculate my gains**. Sales are matched FIFO to purchases with the same
name and investment type; the calculator derives holding period and gain/loss from
the matched cost and sale proceeds. Results are separated by asset type, term, and
financial year. Use **Download full report (PDF)** on the results to save a local
report containing the summary, matched sales, category totals, tax estimate, and
assumptions.

The illustrative tax estimate assumes eligible equity STCG at 20%, equity LTCG at
12.5% after the ₹1,25,000 annual threshold, debt-fund gains at the default editable
30% slab for short-term holdings and 12.5% for eligible long-term holdings, plus
4% cess. It excludes surcharge, rebates, carried-forward losses, fees, other income,
and individual/date-specific tax rules. Confirm the applicable treatment before
filing.
