import { Test } from '@nestjs/testing';
import request from 'supertest';
import { applyProductionLikeMiddleware } from './configure-test-app.js';

const { listenMockHcm } = require('../scripts/mock-hcm-core.cjs');

describe('ExampleHR time-off flow (e2e against mock HCM)', () => {
  let nestApp;
  let mockHcm;

  beforeAll(async () => {
    mockHcm = await listenMockHcm(0);
    process.env.DATABASE_PATH = ':memory:';
    process.env.HCM_BASE_URL = mockHcm.baseUrl;

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    nestApp = moduleRef.createNestApplication();
    applyProductionLikeMiddleware(nestApp);
    await nestApp.init();
  });

  afterAll(async () => {
    if (nestApp) await nestApp.close();
    if (mockHcm) await mockHcm.close();
  });

  const api = () => request(nestApp.getHttpServer());
  const hcmApi = () => request(mockHcm.app);

  it('health endpoint returns ok', async () => {
    const res = await api().get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('10 days in HCM, employee requests 2, approve leaves 8 in both ledgers', async () => {
    await hcmApi()
      .post('/hcm/admin/seed')
      .send({ employeeId: 'e1', locationId: 'hq', availableDays: 10 })
      .expect(200);

    await api()
      .post('/api/v1/sync/balances/batch')
      .send({
        items: [
          {
            employeeId: 'e1',
            locationId: 'hq',
            availableDays: 10,
            sourceToken: 'batch-1',
          },
        ],
      })
      .expect(201);

    const bal1 = await api()
      .get('/api/v1/balances?employeeId=e1&locationId=hq')
      .expect(200);
    expect(bal1.body.effectiveAvailable).toBe(10);

    const created = await api()
      .post('/api/v1/time-off/requests')
      .send({ employeeId: 'e1', locationId: 'hq', days: 2 })
      .expect(201);

    expect(created.body.status).toBe('pending_approval');

    const approved = await api()
      .patch(`/api/v1/time-off/requests/${created.body.id}/approve`)
      .send({})
      .expect(200);

    expect(approved.body.status).toBe('approved');

    const bal2 = await api()
      .get('/api/v1/balances?employeeId=e1&locationId=hq')
      .expect(200);
    expect(bal2.body.availableDays).toBe(8);
    expect(bal2.body.effectiveAvailable).toBe(8);

    expect(mockHcm.getBalance('e1', 'hq')).toBe(8);
  });

  it('retry with same idempotency key does not create a second request', async () => {
    await hcmApi()
      .post('/hcm/admin/seed')
      .send({ employeeId: 'e2', locationId: 'hq', availableDays: 5 })
      .expect(200);

    await api()
      .post('/api/v1/sync/balances/batch')
      .send({
        items: [{ employeeId: 'e2', locationId: 'hq', availableDays: 5 }],
      })
      .expect(201);

    const body = {
      employeeId: 'e2',
      locationId: 'hq',
      days: 1,
      idempotencyKey: 'idem-xyz',
    };

    const a = await api().post('/api/v1/time-off/requests').send(body).expect(201);
    const b = await api().post('/api/v1/time-off/requests').send(body).expect(201);

    expect(b.body.id).toBe(a.body.id);
  });

  it('local sync is optimistic but HCM validate still rejects bad bookings', async () => {
    await hcmApi()
      .post('/hcm/admin/seed')
      .send({ employeeId: 'e3', locationId: 'hq', availableDays: 1 })
      .expect(200);

    await api()
      .post('/api/v1/sync/balances/batch')
      .send({
        items: [{ employeeId: 'e3', locationId: 'hq', availableDays: 10 }],
      })
      .expect(201);

    const res = await api()
      .post('/api/v1/time-off/requests')
      .send({ employeeId: 'e3', locationId: 'hq', days: 3 })
      .expect(201);

    expect(res.body.status).toBe('rejected');
    expect(res.body.lastError).toBeDefined();
  });

  it('after batch tightens available below open reservations, audit records drift', async () => {
    await hcmApi()
      .post('/hcm/admin/seed')
      .send({ employeeId: 'e4', locationId: 'hq', availableDays: 10 })
      .expect(200);

    await api()
      .post('/api/v1/sync/balances/batch')
      .send({
        items: [{ employeeId: 'e4', locationId: 'hq', availableDays: 10 }],
      })
      .expect(201);

    const pending = await api()
      .post('/api/v1/time-off/requests')
      .send({ employeeId: 'e4', locationId: 'hq', days: 4 })
      .expect(201);

    expect(pending.body.status).toBe('pending_approval');

    await api()
      .post('/api/v1/sync/balances/batch')
      .send({
        items: [{ employeeId: 'e4', locationId: 'hq', availableDays: 2 }],
      })
      .expect(201);

    const trail = await api()
      .get(
        '/api/v1/audit/trail?entityType=EmployeeBalance&entityId=e4%3Ahq',
      )
      .expect(200);

    const drift = trail.body.find((e) => e.action === 'balance_drift');
    expect(drift).toBeDefined();
  });

  it('mock accrual route bumps HCM-only balance (work anniversary style)', async () => {
    await hcmApi()
      .post('/hcm/admin/seed')
      .send({ employeeId: 'e5', locationId: 'hq', availableDays: 3 })
      .expect(200);

    await hcmApi()
      .post('/hcm/admin/simulate-accrual')
      .send({ employeeId: 'e5', locationId: 'hq', addDays: 2 })
      .expect(200);

    expect(mockHcm.getBalance('e5', 'hq')).toBe(5);
  });
});
