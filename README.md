# Execute

A React + TypeScript portfolio with a separate `/ideas` area for tools,
experiments, and learning projects.

## Local development

```bash
npm install
npm run dev
```

## Local short video captions

The Short Video Subs Gen tool runs locally and renders word-timed karaoke captions directly into a new MP4. It accepts videos up to 3 minutes and 100 MB. The source video is not sent to a transcription service; it is deleted after processing. Rendered MP4 files expire from `backend/.outputs` after 24 hours. Optional SRT, VTT, and styled ASS sidecars are available too.

Start the frontend and local caption backend together with:

```powershell
npm run trial
```

The first run creates `backend/.venv` and installs the backend dependencies, including a bundled FFmpeg executable. The small Whisper model downloads after the first video is selected. Processing is CPU-based and may take a few minutes on this laptop. The app is for local use; GitHub Pages does not run the backend.

The rendered MP4 uses the selected font, text color, and word-highlight color. SRT/VTT are optional standard subtitle files; ASS preserves word-level karaoke timing and styling.

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

The root URL is the portfolio. The **Ideas** button at the bottom opens `/ideas`;
individual tools use routes such as `/ideas/calculator` and `/ideas/needHelp`.
GitHub Pages is configured with an SPA fallback so direct links and refreshes on
these nested routes load the app.

## Capital gains calculator

From `/ideas`, choose **Advanced Calculator** to open `/ideas/needHelp`. Enter
purchase and sale transactions with investment name/type, date, quantity, and total amount,
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
