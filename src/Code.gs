/**
 * Code.gs - Main entry point, doGet, include helper, setup
 */

function doGet(e) {
  try {
    Auth.checkAccess();
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;' +
      'min-height:100vh;margin:0;background:#f5f5f5;color:#333}' +
      '.card{background:#fff;padding:40px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);' +
      'text-align:center;max-width:400px}h2{color:#d32f2f;margin-bottom:16px}' +
      'p{color:#666;line-height:1.5}</style></head>' +
      '<body><div class="card"><h2>Không có quyền truy cập</h2>' +
      '<p>' + err.message + '</p></div></body></html>'
    ).setTitle('Không có quyền truy cập');
  }
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Quản Lý Giá Sản Phẩm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Setup all 6 sheets with headers. Run once after creating the project.
 */
function setupSheets() {
  var ss;
  var id = getSpreadsheetId();
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('Grocery Manager Data');
    // Auto-save new spreadsheet ID to Script Properties
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
    Logger.log('Đã tạo spreadsheet mới: ' + ss.getUrl());
  }

  var sheetNames = Object.keys(COLUMNS);
  sheetNames.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Set headers
    var headers = COLUMNS[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');

    // Freeze header row
    sheet.setFrozenRows(1);
  });

  // Add sample admin user if Users sheet is empty
  var usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (usersSheet.getLastRow() <= 1) {
    var email = Session.getActiveUser().getEmail() || 'admin@example.com';
    usersSheet.appendRow([email, 'Admin', ROLES.ADMIN, new Date().toISOString()]);
  }

  // Remove default "Sheet1" if it exists and is empty
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() <= 1 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log('Setup complete: ' + sheetNames.length + ' sheets created.');
}

/**
 * Gán SPREADSHEET_ID vào Script Properties.
 * Chạy 1 lần nếu muốn dùng spreadsheet có sẵn.
 */
function setupSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
  Logger.log('SPREADSHEET_ID đã được lưu: ' + id);
}

// ==================== API Wrapper Functions ====================
// These are exposed to frontend via google.script.run

// Auth
function apiGetAuthInfo() {
  try {
    Auth.checkAccess();
    return { success: true, data: Auth.getAuthInfo() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Products
function apiGetProducts() {
  try {
    Auth.checkAccess();
    return { success: true, data: ProductService.getProductsWithPrices() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiCreateProduct(data) {
  try {
    return { success: true, data: ProductService.createProduct(data) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiUpdateProduct(id, data) {
  try {
    return { success: true, data: ProductService.updateProduct(id, data) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiDeleteProduct(id) {
  try {
    return { success: true, data: ProductService.deleteProduct(id) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiSearchProducts(keyword) {
  try {
    Auth.checkAccess();
    return { success: true, data: ProductService.searchProducts(keyword) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Prices
function apiUpdatePrice(productId, buyPrice, sellPrice) {
  try {
    return { success: true, data: PriceService.updatePrice(productId, buyPrice, sellPrice) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiGetPriceHistory(productId, start, end) {
  try {
    Auth.checkAccess();
    return { success: true, data: PriceService.getPriceHistory(productId, start, end) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Categories
function apiGetCategories() {
  try {
    Auth.checkAccess();
    return { success: true, data: CategoryService.getCategoryTree() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiCreateCategory(data) {
  try {
    return { success: true, data: CategoryService.createCategory(data) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiUpdateCategory(id, data) {
  try {
    return { success: true, data: CategoryService.updateCategory(id, data) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiDeleteCategory(id) {
  try {
    return { success: true, data: CategoryService.deleteCategory(id) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Inventory
function apiGetInventory() {
  try {
    Auth.checkAccess();
    return { success: true, data: InventoryService.getInventory() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiUpdateQuantity(productId, qty) {
  try {
    return { success: true, data: InventoryService.updateQuantity(productId, qty) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiRestock(productId, addQty) {
  try {
    return { success: true, data: InventoryService.restock(productId, addQty) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiSetMinStock(productId, min) {
  try {
    Auth.checkAccess();
    return { success: true, data: InventoryService.setMinStock(productId, min) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiGetLowStock() {
  try {
    Auth.checkAccess();
    return { success: true, data: InventoryService.getLowStockProducts() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Reports
function apiGetDashboardStats() {
  try {
    Auth.checkAccess();
    return { success: true, data: ReportService.getDashboardStats() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiGetLowStockReport() {
  try {
    Auth.checkAccess();
    return { success: true, data: ReportService.getLowStockReport() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiGetPriceHistoryReport(productId, start, end) {
  try {
    Auth.checkAccess();
    return { success: true, data: ReportService.getPriceHistoryReport(productId, start, end) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function apiGetInventorySummaryReport() {
  try {
    Auth.checkAccess();
    return { success: true, data: ReportService.getInventorySummaryReport() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
