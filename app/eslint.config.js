const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**', '.expo/**'],
  },
  ...expoConfig,
  {
    rules: {
      // TODO: Fix data-fetching patterns to avoid setState in effects
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
