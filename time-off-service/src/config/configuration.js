import { join } from 'path';

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    path:
      process.env.DATABASE_PATH ||
      join(process.cwd(), 'data', 'time-off.sqlite'),
  },
  hcm: {
    baseUrl: process.env.HCM_BASE_URL || '',
  },
});
