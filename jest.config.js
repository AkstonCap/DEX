module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '^actions/(.*)$': '<rootDir>/src/actions/$1',
    '^components/(.*)$': '<rootDir>/src/components/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^reducers/(.*)$': '<rootDir>/src/reducers/$1',
    '^@emotion/styled$': '<rootDir>/src/__mocks__/@emotion/styled.js',
  },
  testMatch: ['<rootDir>/src/**/*.test.js'],
};
