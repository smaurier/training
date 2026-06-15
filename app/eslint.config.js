const expoConfig = require('eslint-config-expo/flat');
const reactNativeA11y = require('eslint-plugin-react-native-a11y');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**', '.expo/**'],
  },
  ...expoConfig,
  {
    plugins: {
      'react-native-a11y': reactNativeA11y,
    },
    rules: {
      // a11y — errors break screen reader experience
      'react-native-a11y/has-valid-accessibility-descriptors': 'error',
      // a11y — warnings for best practices (downgrade to off for now due to existing violations)
      'react-native-a11y/has-accessibility-hint': 'off',
      'react-native-a11y/no-nested-touchables': 'warn',
      // existing rule
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
