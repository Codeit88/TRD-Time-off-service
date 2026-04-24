/**
 * CLI entry: run `npm run mock:hcm` (default port 9999, override MOCK_HCM_PORT).
 */
const { listenMockHcm } = require('./mock-hcm-core.cjs');

const PORT = Number(process.env.MOCK_HCM_PORT || 9999);

listenMockHcm(PORT)
  .then(({ baseUrl }) => {
    console.log(`Mock HCM listening ${baseUrl}`);
    console.log('Seed: POST /hcm/admin/seed { employeeId, locationId, availableDays }');
    console.log('Accrual sim: POST /hcm/admin/simulate-accrual { employeeId, locationId, addDays }');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
