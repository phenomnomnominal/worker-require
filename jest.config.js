module.exports = {
  globals: {
    tsConfig: 'tsconfig.test.json',
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**', '!<rootDir>/src/vendor/**'],
  coverageDirectory: '<rootDir>/reports/coverage',
  transform: {
    '\\.(ts)$': 'ts-jest',
  },
  testRegex: '/test/.*\\.spec\\.ts$',
};
