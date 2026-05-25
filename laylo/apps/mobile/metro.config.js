const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force a single instance of React + React Native. The root `package.json`
// `overrides: { react: "^18.3.0" }` pins React 18.3.1 across the workspace
// (including react-native and every other transitive dep). The mobile
// workspace's direct `react@18.2.0` declaration leaves a *second* copy at
// `apps/mobile/node_modules/react`, so we MUST resolve `react` to the root
// copy that react-native itself binds to. Pointing this at the mobile copy
// loads two Reacts → the hook dispatcher returns null and every component
// crashes with "Cannot read property 'useMemo' of null".
config.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  // expo-router is hoisted to workspace root; Metro's HmrServer reads the
  // `main: "expo-router/entry"` field as a literal `./node_modules/expo-router/
  // entry` lookup from projectRoot and crashes if it isn't here. The initial
  // bundle finds it via hierarchical lookup, but the HMR registration uses a
  // stricter relative resolution path.
  'expo-router': path.resolve(workspaceRoot, 'node_modules/expo-router'),
};

// Note: we deliberately do NOT set `disableHierarchicalLookup = true`. With
// it enabled, Metro's HmrServer can't resolve `./node_modules/expo-router/
// entry` from the project root (expo-router lives at workspace root) and
// crashes on startup. `extraNodeModules` is checked first regardless, so the
// React/RN dedup above is preserved.

module.exports = config;
