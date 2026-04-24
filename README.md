# time-off-service

Sami Khokher · MindlblazeTech · 24 April 2026

Backend for the **ExampleHR** time-off flow from the assessment brief: employees file leave in ExampleHR, **HCM** (Workday-style) stays source of truth, and this service sits in the middle—balances, validation, approvals, and sync.

The written spec is **[docs/TRD.md](docs/TRD.md)**. It calls out the hard parts (two writers, anniversary accruals, dimensions, flaky HCM errors), what we implemented, and the alternatives we discarded.

## Setup

1. **Prerequisites:** [Node.js](https://nodejs.org/) **18** or newer (20 LTS is a good default). This repo uses plain JavaScript and `npm`; no global CLI tools are required.
2. Install dependencies from the `time-off-service` directory:

   ```bash
   cd time-off-service
   npm install
   ```

   That reads `package.json` / `package-lock.json` and installs all runtime and dev dependencies (including native `better-sqlite3`; on macOS, Xcode Command Line Tools are enough for the compile step if one runs).

3. **Updating dependencies** (optional): to bump packages within the ranges already allowed in `package.json`, run:

   ```bash
   npm update
   ```

   To change major versions or edit the lockfile more aggressively, adjust `package.json` and run `npm install` again (or use `npm outdated` to see what is behind).

## Database

Default is a normal SQLite file: `data/time-off.sqlite` (created on first boot). Override with `DATABASE_PATH` or `:memory:` for tests. Stack is TypeORM + `better-sqlite3`.

## Run locally

You need something that speaks the HCM paths this service calls. The repo ships a small Express mock (`scripts/mock-hcm-core.cjs`); the CLI wrapper is `npm run mock:hcm` (port 9999 unless you set `MOCK_HCM_PORT`).

```bash
# shell A
npm run mock:hcm

# shell B
export HCM_BASE_URL=http://127.0.0.1:9999
npm run start
```

Sanity check: `curl http://127.0.0.1:3000/api/v1/health`

`npm run start:dev` uses the same SWC setup as `start` (`SWCRC=1`, see `.swcrc`).

## Tests and coverage

Tests are **scenario-driven** on purpose: unit/service tests mock I/O; e2e runs the full app against the mock HCM over HTTP so regressions show up the way they would in integration.

| Command | Purpose |
|---------|---------|
| `npm test` | Jest unit + service specs (`@swc/jest`) |
| `npm run test:e2e` | Full Nest app, in-memory DB, mock HCM on ephemeral port |
| `npm run test:cov` | Unit run + `coverage/lcov.info` and `coverage/index.html` |
| `npm run test:all` | Coverage, then e2e (good before you hand the repo in) |

If you are reviewing: after `npm run test:cov`, open `coverage/index.html` in a browser, or pipe `coverage/lcov.info` into whatever you already use in CI.

## GitHub

The assessment asks for a repo on GitHub; create a remote and push from your machine, for example:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## Mock HCM routes (quick reference)

- `POST /hcm/admin/seed` — set `{ employeeId, locationId, availableDays }`
- `POST /hcm/admin/simulate-accrual` — add days on the HCM side only (anniversary-style)
- `POST /hcm/v1/time-off/validate` — pre-check
- `POST /hcm/v1/time-off/commit` — book on approve
