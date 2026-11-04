/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-no-unsupported-browser-features'],
  rules: {
    // Reads "browserslist" from package.json.
    'plugin/no-unsupported-browser-features': [
      true,
      {
        severity: 'error',
        ignore: [
          // Compiled away by Sass.
          'css-nesting',
          // Vendor prefixes are added by autoprefixer.
          'css-appearance',
          'user-select-none',
          'css-sticky',
          // Harmless: ignored where unsupported (fallbacks, cosmetic).
          'font-family-system-ui',
          'css-selection',
          'css3-cursors',
          // False positive: `text-decoration: none` works everywhere.
          'mdn-text-decoration-shorthand',
        ],
        ignorePartialSupport: true,
      },
    ],
    // The standard config enforces modern syntaxes that the supported browsers don't parse:
    // keep `rgba(0, 0, 0, 0.1)` and `(min-width: 600px)`.
    'color-function-notation': 'legacy',
    'color-function-alias-notation': null,
    'alpha-value-notation': 'number',
    'media-feature-range-notation': 'prefix',
    // Don't merge longhands into shorthands the target browsers lack (inset: Safari 14.1, Chrome 87).
    'declaration-block-no-redundant-longhand-properties': [
      true,
      {ignoreShorthands: ['inset', 'gap', 'place-items', 'place-content']},
    ],
    // BEM-style class names: fioi-block__header--open
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      {message: 'Use BEM-style class names (block__element--modifier)'},
    ],
  },
};
