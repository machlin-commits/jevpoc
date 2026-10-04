# Jev POC

Describe a project and watch technologies assemble from a scattered SVG logo pile into a compact grid with category labels on every tile. React 18, Vite, TypeScript, Tailwind, Framer Motion, and FastAPI with Pydantic v2 power the app.

<img width="853" height="800" alt="image" src="https://github.com/user-attachments/assets/67f1bc3c-39f9-4053-b55c-096ec8f69dd2" />


## Run locally

Requires Node.js 20.19+ (or 22.12+) and Python 3.11+.

```sh
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.main
```

In a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. FastAPI listens on port 8000; Vite proxies `/api` requests to it. `backend/.env` is already configured, and `backend/.env.example` mirrors the supplied template. The backend loads that file with `load_dotenv()` using an absolute path. Environment variables take precedence. Change `JEV_API_KEY` in the environment file when needed. The key stays server-side.

## How recommendations work

The primary integration calls the [official TypeSafe System One endpoint](https://docs.typesafe.ai/api), `POST https://api.typesafe.ai/v1/systemone`, using `jev-latest`. All 140 technologies are evaluated with independent Noul relevance questions in **one consolidated request per query**, producing 0–1 probabilities. Results above 0.56 are sorted into six categories, capped at five per category. These are relevance recommendations, not a guarantee that every recommended technology should be used together.

Missing/placeholder keys, timeouts (12 seconds), rejected requests, and invalid responses invoke the zero-config keyword fallback. The UI explicitly labels the fallback and its scores as heuristic relevance, not calibrated probabilities. Unknown prompts produce an empty result with guidance. No browser-side mock classifier hides backend failures.

Cost is estimated from reported input tokens using $42 per billion input tokens ([TypeSafe pricing](https://typesafe.ai/)); the `≈` badge identifies estimates. Fallback queries cost $0. Missing usage is not fabricated. Latency measures the entire backend classification request, including any failed upstream attempt.

Search submits immediately when the prompt changes, including sample-prompt clicks. Enter also submits immediately. Clearing aborts pending requests, discards stale responses, and returns all logos to deterministic randomized positions. Every technology uses `layoutId="logo-{id}"` and the requested spring (350 stiffness, 28 damping). Reduced motion and responsive mobile layouts are supported.

## Catalog and brand assets

`shared/catalog.json` is the single catalog consumed in memory by `backend/catalog.py` and `frontend/src/catalog.ts`. It includes 140 entries and all required taxonomy fields.

Brand paths are bundled locally from Simple Icons (v11 for legacy Microsoft marks, current catalog for new brands). Product families use the vendor's mark when there is no distinct mark: AutoGen and Semantic Kernel use Microsoft; SwiftUI uses Swift; Azure products use Azure. Four unavailable Simple Icons brands use authentic supplementary SVG assets; see [asset sources](frontend/public/logos/SOURCES.md). No logo depends on a runtime image CDN.

```sh
node scripts/export-logos.mjs
```

Regenerates logo paths and catalog colors after catalog edits. `scripts/make_catalog.py` seeds the curated catalog; rerun the exporter after using it.

## Verification

```sh
python -m pytest backend -q
cd frontend
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests expect both development servers running and an empty API key (`JEV_API_KEY= python -m backend.main`) to exercise deterministic fallback. Playwright uses its installed Chromium by default. Set `CHROME_PATH` to a local Chrome binary to use that instead. Tests cover assembly, stack switching, reset, mobile width, and cancellation. Backend tests cover all sample stacks, input validation, consolidated request structure, probability parsing, and upstream failures.

To make a single live integration check (uses the configured key and may incur API cost):

```sh
PYTHONPATH=. python scripts/check-live.py
```

## API

- `GET /api/health` — health and catalog size
- `GET /api/catalog` — complete catalog
- `POST /api/classify` — `{ "prompt": "Enterprise multi-agent workflow on Microsoft stack" }`

The response contains matches (`id`, `confidence`), engine, latency, input/output token counts, estimated cost, and a fallback reason when applicable. Prompts are trimmed and limited to 2,000 characters. Development CORS allows localhost:5173 and 127.0.0.1:5173. This POC keeps the catalog in memory and has no database.

The canvas uses a compact layout that fits all 30 possible recommendations at 1280 × 720. Eight example prompts include bakery websites, microservices, mobile apps, RAG, and streaming pipelines. Token counters in the top-right header show reported usage for the latest query; missing usage displays as “—”, while a local-only fallback displays zero. Usage is measured for the consolidated query, not attributed to individual categories.
# jevpoc
