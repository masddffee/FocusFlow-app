// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for React Native 0.79 Metro bundler package exports issues
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false
};

module.exports = config;
