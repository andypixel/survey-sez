module.exports = {
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/server/setup.js']
};