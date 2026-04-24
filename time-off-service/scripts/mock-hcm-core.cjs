/* Tiny Express stand-in for Workday/SAP-style validate+commit. Shared by CLI and Jest e2e. */
const express = require('express');
const crypto = require('crypto');

const key = (e, l) => `${e}:${l}`;

function createMockHcmCore() {
  const balances = new Map();
  const app = express();
  app.use(express.json());

  app.get('/health', (_, res) => res.json({ ok: true }));

  app.post('/hcm/admin/seed', (req, res) => {
    const { employeeId, locationId, availableDays } = req.body;
    if (!employeeId || !locationId || availableDays == null) {
      return res.status(400).json({ error: 'employeeId, locationId, availableDays required' });
    }
    balances.set(key(employeeId, locationId), Number(availableDays));
    res.json({ ok: true, balance: balances.get(key(employeeId, locationId)) });
  });

  /** Simulates HCM-side accrual (e.g. work anniversary) without going through ReadyOn. */
  app.post('/hcm/admin/simulate-accrual', (req, res) => {
    const { employeeId, locationId, addDays } = req.body;
    if (!employeeId || !locationId || addDays == null) {
      return res.status(400).json({ error: 'employeeId, locationId, addDays required' });
    }
    const k = key(employeeId, locationId);
    const cur = balances.get(k);
    if (cur == null) {
      return res.status(404).json({ error: 'unknown_employee_location_in_hcm' });
    }
    const next = Math.round((cur + Number(addDays)) * 1000) / 1000;
    balances.set(k, next);
    res.json({ ok: true, balance: next });
  });

  app.post('/hcm/v1/time-off/validate', (req, res) => {
    const { employeeId, locationId, days } = req.body;
    const avail = balances.get(key(employeeId, locationId));
    if (avail == null) {
      return res.status(404).json({ ok: false, error: 'unknown_employee_location_in_hcm' });
    }
    if (avail + 1e-9 < Number(days)) {
      return res.status(409).json({ ok: false, error: 'insufficient_balance_in_hcm' });
    }
    res.json({
      ok: true,
      ref: `val-${crypto.randomBytes(6).toString('hex')}`,
    });
  });

  app.post('/hcm/v1/time-off/commit', (req, res) => {
    const { employeeId, locationId, days } = req.body;
    const k = key(employeeId, locationId);
    const avail = balances.get(k);
    if (avail == null) {
      return res.status(404).json({ ok: false, error: 'unknown_employee_location_in_hcm' });
    }
    const d = Number(days);
    if (avail + 1e-9 < d) {
      return res.status(409).json({ ok: false, error: 'insufficient_balance_in_hcm' });
    }
    balances.set(k, Math.round((avail - d) * 1000) / 1000);
    res.json({
      ok: true,
      ref: `cmt-${crypto.randomBytes(6).toString('hex')}`,
    });
  });

  return {
    app,
    getBalance(employeeId, locationId) {
      return balances.get(key(employeeId, locationId));
    },
    seed(employeeId, locationId, availableDays) {
      balances.set(key(employeeId, locationId), Number(availableDays));
    },
  };
}

function listenMockHcm(port) {
  const core = createMockHcmCore();
  return new Promise((resolve, reject) => {
    const server = core.app.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        ...core,
        server,
        port: addr.port,
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
    server.on('error', reject);
  });
}

module.exports = { createMockHcmCore, listenMockHcm };
