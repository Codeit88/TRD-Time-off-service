# TRD: Time-off service behind ExampleHR

**Author:** Sami Khokher · **Company:** MindlblazeTech · **Date:** 24 April 2026

## Why this exists

ExampleHR is where employees actually request time off. Workday (or SAP, or another vendor) stays the payroll and entitlement system of record—we will call that **HCM** here.

The situation the product cares about is simple to state and annoying to implement: an employee might show **10 days** of leave in ExampleHR, request **2 days**, and we need to know HCM would accept that booking before we waste a manager’s time. At the same time, HCM does not stand still. Accruals on a work anniversary, a January reset, or a correction job can change balances **without anyone touching ExampleHR**. So our copy of the numbers will sometimes be wrong until the next sync, and we still have to behave safely.

This document is what I would hand a tech lead before a review: what breaks, what we built, and what we decided not to do.

---

## Challenges (what actually goes wrong)

**Two systems, one number.** If we only trust our database, we lie to the user when HCM disagrees. If we call HCM on every screen paint, we are slow and brittle when their API hiccups. We need a local balance for speed and an HCM check at the moments that matter (validate on submit, commit on approve).

**HCM is not only updated through ExampleHR.** Anniversary credits and batch jobs are the obvious examples. That means our `available` field is a snapshot. Until batch ingest runs, ExampleHR and HCM can diverge without anyone doing anything wrong.

**Dimensions.** The exercise scopes balances to **employee + location**. In real life you would add leave type, cost center, percent FTE, and so on. HCM can still say “no” for a combination that looks fine locally. We send employee, location, and days to validate/commit; extending dimensions is mostly more columns and stricter DTOs, not a different architecture.

**You cannot assume HCM always errors clearly.** The brief already said as much. So we keep **reservations** and a **version** on the balance row: we do not rely on a polite 409 from the vendor for correctness.

**Double submits.** Mobile clients retry. Users double-tap. We support an **idempotency key** on create so the same intent does not create two rows.

---

## What we built (short version)

NestJS service, SQLite on disk for local runs (`better-sqlite3`), TypeORM entities for balances, requests, audit log, and an outbox table for outbound HCM calls.

Flow for a request:

1. Load local balance for `(employeeId, locationId)`. Refuse if there is no row (sync has not run).
2. Check **effective** balance: `available - reserved` must cover the request.
3. **Reserve** the days in a transaction so two concurrent requests do not overspend locally.
4. Call HCM **validate**. If HCM says no, release the reservation and mark the request rejected.
5. Manager **approves**. If our balance **version** changed since submit (e.g. a sync landed), we **validate again** against HCM before commit.
6. Call HCM **commit**. On success we deduct `available`, drop the reservation, bump version. On failure we release the reservation and reject.

HCM pushes (or a job acting for HCM) call **batch sync** with the full set of `(employee, location, available)` rows we care about. If the new `available` from HCM is **below** what we already have **reserved** for open requests, we write a **`balance_drift`** audit event. We do not auto-cancel in-flight requests in v1; ops can react from the audit trail.

The **outbox** records each validate/commit attempt so a later worker could retry without redesigning the schema. Right now processing is synchronous; the table is there so we do not paint ourselves into a corner.

---

## Alternatives we talked ourselves out of

**Making ExampleHR the ledger.** Easiest for UX, worst for payroll truth. Rejected.

**No local balance—every read hits HCM.** Truthy, but slow, rate-limited, and ugly when HCM is down. We keep a local snapshot and hit HCM on validate/commit instead.

**No reservation, only optimistic locking.** Fewer writes, but two overlapping requests can both look fine until one hits HCM. Reservations cost a bit of SQL and save that class of bug.

**Polling HCM on an interval instead of accepting batch uploads.** Works for tiny tenants; for large ones you still need a bulk path and you still need dimensions on each row. We took **batch ingest + point validate/commit**.

**GraphQL for the public API.** Fine for a big product; this codebase sticks to **REST** so the assessment stays easy to read.

---

## API (v1)

Rough map for anyone scanning the repo:

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/health` | Alive check |
| GET | `/api/v1/balances` | `employeeId`, `locationId` query params |
| POST | `/api/v1/sync/balances/batch` | HCM-shaped bulk upsert |
| POST | `/api/v1/time-off/requests` | Body includes `employeeId`, `locationId`, `days`; optional `idempotencyKey` |
| GET | `/api/v1/time-off/requests/:id` | |
| PATCH | `/api/v1/time-off/requests/:id/approve` | Manager path |
| GET | `/api/v1/audit/trail` | `entityType`, `entityId` |

HCM side (real integration or our mock): `POST .../hcm/v1/time-off/validate`, `.../commit`. The mock also exposes admin routes to **seed** balances and **simulate-accrual** so tests can mimic an anniversary without a second product.

---

## Security and ops (one paragraph)

Authn/z and tenant isolation are assumed to sit in front of this service in production. Employee IDs are treated as opaque strings. HCM credentials belong in env or a vault, not in SQLite.

---

## How we test it

Unit tests cover the small pure helpers, the HCM HTTP adapter (happy path + failure mapping), and the time-off/sync/outbox/audit services with mocks so we can force edge cases without a database.

End-to-end tests boot the real Nest app with an in-memory database and a **real HTTP mock HCM** on a random port. Scenarios include: the “10 days / request 2 / approve” style happy path, idempotent double POST, local sync optimistic vs HCM strict, drift after a harsh batch update, and an accrual-only change on the HCM mock.

Coverage output: run `npm run test:cov` and open `coverage/index.html` or feed `coverage/lcov.info` to your tool of choice. Controllers are exercised mainly through e2e, not duplicated in shallow unit tests.

---

## What we did not build yet

Async worker draining the outbox with backoff. Webhooks from HCM for faster convergence. Rich leave-type dimensions. Generated OpenAPI and contract tests against a frozen HCM stub. All reasonable next steps once the core path is signed off.
