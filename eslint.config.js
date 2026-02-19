const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.gs'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        // Google Apps Script globals
        SpreadsheetApp: 'readonly',
        CacheService: 'readonly',
        LockService: 'readonly',
        PropertiesService: 'readonly',
        Session: 'readonly',
        Utilities: 'readonly',
        DriveApp: 'readonly',
        HtmlService: 'readonly',
        Logger: 'readonly',
        ContentService: 'readonly',
        UrlFetchApp: 'readonly',
        Blob: 'readonly',
        // Project modules (IIFE pattern — writable because they self-assign)
        SheetHelper: 'writable',
        CacheHelper: 'writable',
        Auth: 'writable',
        CategoryService: 'writable',
        PriceService: 'writable',
        ProductService: 'writable',
        InventoryService: 'writable',
        ImageService: 'writable',
        ReportService: 'writable',
        // Config globals
        APP_NAME: 'writable',
        SHEETS: 'writable',
        COLUMNS: 'writable',
        ID_PREFIXES: 'writable',
        CACHE_TTL: 'writable',
        ROLES: 'writable',
        DRIVE: 'writable',
        getSpreadsheetId: 'writable',
        ...globals.browser,
      },
    },
    rules: {
      // GAS top-level functions/vars are called externally — suppress false positives
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^(api|do|include|setup|get\\w+|APP_NAME|SHEETS|COLUMNS|ID_PREFIXES|CACHE_TTL|ROLES|DRIVE|Auth|SheetHelper|CacheHelper|\\w+Service)',
      }],
      'no-var': 'off',
      'prefer-const': 'off',
      'no-undef': 'warn',
      'no-redeclare': 'off',
      'no-useless-escape': 'warn',
    },
  },
];
