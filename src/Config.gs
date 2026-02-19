/**
 * Config.gs - Application constants and configuration
 */

// Replace with your actual Spreadsheet ID after creating it
var SPREADSHEET_ID = '';

var SHEETS = {
  PRODUCTS: 'Products',
  PRICES: 'Prices',
  INVENTORY: 'Inventory',
  PRICE_HISTORY: 'PriceHistory',
  USERS: 'Users',
  CATEGORIES: 'Categories'
};

var COLUMNS = {
  Products: ['id', 'name', 'category_id', 'unit', 'barcode', 'description', 'status', 'created_at', 'updated_at'],
  Prices: ['id', 'product_id', 'buy_price', 'sell_price', 'updated_at', 'updated_by'],
  Inventory: ['id', 'product_id', 'quantity', 'min_stock', 'last_restock', 'updated_at'],
  PriceHistory: ['id', 'product_id', 'old_buy', 'new_buy', 'old_sell', 'new_sell', 'changed_at', 'changed_by'],
  Users: ['email', 'name', 'role', 'created_at'],
  Categories: ['id', 'name', 'parent_id', 'created_at']
};

var CACHE_TTL = 600; // 10 minutes in seconds

var ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer'
};

var ID_PREFIXES = {
  Products: 'P',
  Prices: 'PR',
  Inventory: 'INV',
  PriceHistory: 'PH',
  Categories: 'CAT'
};
