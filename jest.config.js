module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // App code imports icon sets per file (keeps unused glyph maps out of the web bundle);
    // route them through the barrel so tests' jest.mock('@expo/vector-icons') still applies.
    '^@expo/vector-icons/(Ionicons|MaterialCommunityIcons)$': '<rootDir>/tests/support/vectorIcons/$1.js',
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
