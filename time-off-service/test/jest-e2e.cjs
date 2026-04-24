const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  rootDir: path.join(__dirname, '..'),
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.e2e-spec.js'],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': '@swc/jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.cjs'],
  testTimeout: 30000,
  maxWorkers: 1,
};
