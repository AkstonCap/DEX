module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleDirectories: ['node_modules', 'src'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!nexus-module)',
  ],
};
