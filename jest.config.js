module.exports = {
  preset: 'ts-jest',
  // needs to stay in sync with `paths` element in tsconfig
  moduleNameMapper: {
    '^/test/(.*)$': '<rootDir>/src/_test/$1',
    '^/(.*)$': '<rootDir>/src/$1',
  },
}
