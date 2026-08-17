/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testTimeout: 20000,
};
