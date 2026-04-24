Skip to content
Codeit88
TRD-Time-off-service
Repository navigation
Code
Issues
Pull requests
Agents
Actions
Projects
Wiki
Security and quality
Insights
Settings
Important update
On April 24 we'll start using GitHub Copilot interaction data for AI model training unless you opt out. Review this update and manage your preferences in your GitHub account settings.
Files
Go to file
t
T
time-off-service
data
docs
scripts
src
test
.babelrc
.gitignore
.prettierrc
.swcrc
README.md
index.js
jest.config.cjs
jsconfig.json
nest-cli.json
nodemon.json
package-lock.json
package.json
README.md
TRD-Time-off-service/time-off-service
/
README.md
in
main

Edit

Preview
Indent mode

Spaces
Indent size

2
Line wrap mode

Soft wrap
Editing README.md file contents
  1
  2
  3
  4
  5
  6
  7
  8
  9
 10
 11
 12
 13
 14
 15
 16
 17
 18
 19
 20
 21
 22
 23
 24
 25
 26
 27
 28
 29
 30
 31
 32
 33
 34
 35
 36
 37
 38
 39
 40
 41
 42
 43
 44
 45
 46
 47
 48
 49
 50
 51
 52
 53
 54
 55
 56
 57
 58
# time-off-service

Sami Khokher · MindlblazeTech · 24 April 2026

Backend for the **ExampleHR** time-off flow from the assessment brief: employees file leave in ExampleHR, **HCM** (Workday-style) stays source of truth, and this service sits in the middle—balances, validation, approvals, and sync.

The written spec is **[docs/TRD.md](docs/TRD.md)**. It calls out the hard parts (two writers, anniversary accruals, dimensions, flaky HCM errors), what we implemented, and the alternatives we discarded.

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

Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
No file chosen
Attach files by dragging & dropping, selecting or pasting them.
