# Flowgorithm imtihon platformasi

React 18 + Vite + TypeScript + Tailwind. Students answer test questions and solve problems in the
Flowgorithm desktop app, upload `.fprg` files, and the app judges them in the browser (like Codeforces).
A PDF report plus a ZIP of all submitted files are sent to Telegram automatically.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/ (uses the committed src/data/bank.json)
npm run build:full # regenerate the bank first (needs the private scripts/src/problems.ts)
npm run preview    # serve dist/
npm test           # interpreter unit tests (97)
npm run e2e        # full browser test on the production build (needs Playwright + Chromium)
```

`dist/` is a static site: copy it to any web host, or push the repo to GitHub — `.github/workflows/deploy.yml`
publishes it to GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Exam structure (`src/config/exam.config.ts`)

| Part | Content | Count | Time | Points |
|---|---|---|---|---|
| 1-qism | Test: oʻzgaruvchilar, Input/Output, amallar, mod (pool 67) | 25 | 35 min | 1 |
| 2-qism | Test: If, ichma-ich If, For, For+If (pool 74) | 30 | 40 min | 1 |
| 3-qism | Practical problems, `.fprg` upload (pool 50) | 20 | 120 min | 3 |
| 4-qism | Hard problems (pool 17) — judged and shown, **not counted** in the total | 5 | 60 min | 3 (bonus) |

Every number lives in `exam.config.ts`. Set `counted: true` on part 4 to make it count.

## Session / resume (the old "questions changed after refresh" bug)

- The attempt stores the **exact list of drawn question/problem ids** and option orders (not just a seed),
  in `localStorage` and IndexedDB. A refresh reopens the exam directly with the same questions, the same
  answers and a running timer (time keeps counting while the page is closed).
- If the current-attempt key is ever lost, the entering page shows **«Tugallanmagan imtihon → Davom ettirish»**,
  which restores the same attempt from IndexedDB.
- Starting a new exam while one is unfinished asks for confirmation; the old one is marked abandoned.
- All store actions are guarded by phase (double-clicking «Boshlash» cannot skip a part).
- Uploaded files are kept in IndexedDB.

## Telegram

The bot token and chat id are in `src/config/secrets.ts` (the owner asked for direct mode). They can also be
overridden at build time with `VITE_BOT_TOKEN` / `VITE_CHAT_ID`.

**Security warning:** in a static website the token is visible to anyone who opens the browser dev tools,
and anyone who has it can control the bot. Use a bot made only for this exam and revoke the token in
@BotFather (`/revoke`) after the exam. For a hidden token, put a small proxy (e.g. a Cloudflare Worker that
forwards `sendMessage`/`sendDocument`) in front and set `delivery.mode = "proxy"`.

What is sent: a start message, then on final submit an HTML result message, the PDF
(`DD-MM-YYYY_Familiya_Ism_Flowgorithm-imtihon.pdf`) and a ZIP (`DD-MM-YYYY_Familiya_Ism.zip`, with the folders
`DD-MM-YYYY/Familiya_Ism/3-qism/P01_….fprg` and `result.json`). The delivery queue lives in IndexedDB. It retries
with backoff, respects `retry_after`, and resumes when the browser comes back online or on the next page load.
Each step is sent only once per attempt id.

## Question bank (`npm run bank`)

Sources are in `scripts/src/` (questions as data, problems with Flowgorithm reference solutions). The generator:
- runs every program with the interpreter and writes the correct answers and expected outputs (nothing by hand);
- checks that the explanation contains the real result and that no wrong option equals the real output;
- compares every Part 3 sample output with the outputs published to students earlier;
- generates 8–15 hidden tests per problem and checks that deliberately wrong (mutated) solutions fail;
- runs a scope scanner (no While, arrays, functions; no If/For before they are taught; nested For only in Part 4);
- writes `coverage.md` (concept → question ids) and balances the answer letters A/B/C/D.

Reference solutions and hidden expected outputs are **not shipped**: the bundle only contains SHA-256 hashes
of the hidden outputs. Reference solutions are in `scripts/out/reference/` (for the teacher). The trade-off:
the PDF shows hidden-test inputs and the student's output, but not the expected text of hidden tests.

## Project layout

```
src/judge       .fprg parser, expression evaluator, runtime, Web Worker
src/flowchart   SVG flowchart renderer + pseudocode
src/pdf         PDF report (pdfmake, embedded Inter + JetBrains Mono fonts)
src/delivery    Telegram API, queue, ZIP
src/store       exam state (zustand) with persistence
src/screens     Welcome, Transition, Exam, QuestionView, ProblemWorkspace, Review, Judging, Results
scripts         bank generator
tests           vitest unit tests, fixtures (real .fprg files), e2e.mjs (Playwright)
```

## Privacy

Student names and answers stay in the browser (localStorage/IndexedDB) and are sent only to the configured
Telegram chat. During the exam the site makes no other network requests (fonts are bundled).

## Note for this public repository

`scripts/src/problems.ts` (reference solutions) is **not** committed so students cannot copy the answers.
The committed `src/data/bank.json` contains only hashes of the hidden test outputs. Keep the full project zip privately.
