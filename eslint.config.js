export default [
  {
    files: ['src/**/*.js', 'scripts/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: { 'no-unused-vars': ['warn', { caughtErrors: 'none' }] },
  },
];
