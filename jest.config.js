module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|@react-native-async-storage/async-storage)',
  ],
  setupFiles: ['@react-native-async-storage/async-storage/jest/async-storage-mock'],
  setupFilesAfterEnv: [],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.agents/',
  ],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.[jt]s?(x)',
    '<rootDir>/tests/e2e/**/*.test.[jt]s?(x)',
    '<rootDir>/tests/**/*.test.[jt]s?(x)',
  ],
  testEnvironment: 'node',
};
