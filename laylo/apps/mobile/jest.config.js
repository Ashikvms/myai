/**
 * Jest config for the BillBee mobile app.
 *
 * Uses the `jest-expo` preset (SDK 51) which wires up the right
 * transformers + module mocks for React Native + Expo modules.
 *
 * `transformIgnorePatterns` is broadened to let common ESM-shipping
 * RN/Expo packages through Babel — without this, importing
 * `react-native` from a test would crash on `import` syntax.
 */
/**
 * The workspace root resolved react 18.3.1, but the mobile app pins
 * react@18.2.0 (Expo SDK 51 requirement) which npm placed inside
 * apps/mobile/node_modules/react. Without the moduleNameMapper below,
 * Jest loads BOTH copies — react-test-renderer pulls the root 18.3,
 * the AuthProvider pulls the local 18.2 — and `useContext` ends up
 * comparing context objects from two different React instances. The
 * mapper pins every test to the local 18.2 copy.
 */
const path = require('path');
const reactDir = path.resolve(__dirname, 'node_modules/react');

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^react$': path.join(reactDir, 'index.js'),
    '^react/(.*)$': path.join(reactDir, '$1'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|nativewind))',
  ],
};
