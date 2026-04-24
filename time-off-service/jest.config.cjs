/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.js'],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': '@swc/jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.cjs'],
  collectCoverageFrom: [
    'src/common/**/*.js',
    'src/audit/audit.service.js',
    'src/outbox/outbox.service.js',
    'src/sync/sync.service.js',
    'src/time-off/time-off.service.js',
    'src/hcm/hcm.client.js',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
};
