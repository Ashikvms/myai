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
 * Pin every test to a single React install so context comparisons stay
 * consistent. The mobile package.json now matches the workspace
 * (`react@^18.3.0`), so the hoisted root copy is the canonical one;
 * we resolve it dynamically via `require.resolve` instead of guessing
 * the install layout. Without this mapper, jest-expo + the test
 * renderer can end up pulling two React instances, which breaks
 * `useContext` (returned values come from different Context objects).
 */
const path = require('path');
const reactDir = path.dirname(require.resolve('react/package.json'));

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
