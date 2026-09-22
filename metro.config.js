// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Disable Expo Router's strict react-navigation compatibility check during bundling.
// As of SDK 56, expo-router checks for @react-navigation imports unless disabled.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase modular SDK v11 packages (@firebase/auth, @firebase/firestore, etc.)
// export CommonJS modules with '.cjs' extensions. Metro needs 'cjs' in sourceExts.
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

module.exports = config;
