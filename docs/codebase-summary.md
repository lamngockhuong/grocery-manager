# Codebase Summary

## Overview

The Grocery Manager codebase is organized into two main layers:

1. **Backend** (Google Apps Script): 10 .gs files handling API, services, and data access
2. **Frontend** (HTML/JS/CSS): 8 .html files for SPA UI, routing, and styling

Total: 19 files, 2,634 LOC in `src/` directory.

## Directory Structure

```bash
src/
├── Config.gs                 # Configuration & constants
├── SheetHelper.gs           # Generic CRUD utilities
├── CacheHelper.gs           # Caching with chunking
├── Auth.gs                  # Authentication & RBAC
├── Code.gs                  # Main entry point & API wrappers
├── ProductService.gs        # Product CRUD + search
├── PriceService.gs          # Price CRUD + history
├── CategoryService.gs       # Category CRUD
├── InventoryService.gs      # Inventory CRUD + restock
├── ReportService.gs         # Dashboard & reports
├── index.html               # SPA shell & routing
├── app.js.html              # State manager, API wrapper, utils
├── styles.css.html          # Custom styles & responsive
├── products.html            # Product page
├── categories.html          # Category page
├── inventory.html           # Inventory page
├── dashboard.html           # Dashboard page
├── reports.html             # Reports page
└── appsscript.json          # GAS project config
```

## Backend Architecture

### Layer 1: Entry Point (Code.gs)

- `doGet()`: SPA entry point, returns index.html
- `include(filename)`: Server-side include helper for HtmlService
- `setupSheets()`: One-time setup, creates 6 sheets + headers + admin user
- 20 `api*` wrapper functions: Exposed to frontend via google.script.run

**Key Pattern:**

```javascript
function apiGetProducts() {
  try {
    Auth.checkAccess();                    // Authorization
    return { success: true, data: ... };   // Standardized response
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

### Layer 2: Services (IIFE Modules)

Each service is an Immediately Invoked Function Expression (IIFE) exporting public methods:

#### ProductService.gs (177 LOC)

**Methods:**

- `getProducts()` - Get all active products (cached)
- `getProductById(id)` - Get by ID
- `createProduct(data)` - Validates duplicate names, auto-creates price & inventory
- `updateProduct(id, data)` - Partial updates
- `deleteProduct(id)` - Soft delete (status='inactive')
- `searchProducts(keyword)` - Case-insensitive keyword search
- `filterByCategory(categoryId)` - Filter by parent category
- `getProductsWithPrices()` - JOIN products + prices (cached)
- `bulkUpdateStatus(ids, status)` - Batch status update

**Validation Rules:**

- Product name required, must be unique (case-insensitive, active only)
- Unit required
- Category must exist (if specified)
- Prices >= 0

**Cache Keys:** `products`, `products_with_prices`

#### PriceService.gs (128 LOC)

**Methods:**

- `getPrices()` - Get all prices (cached)
- `createPrice(productId, buyPrice, sellPrice)` - Create on product creation
- `updatePrice(productId, buyPrice, sellPrice)` - Atomic with LockService, logs to PriceHistory
- `getPriceHistory(productId, start, end)` - Filter by date range

**Key Features:**

- Atomic updates via LockService (prevents concurrent conflicts)
- Auto-logs all changes to PriceHistory sheet
- Tracks who changed (Session.getActiveUser().getEmail())
- Tracks when changed (new Date().toISOString())

#### CategoryService.gs (123 LOC)

**Methods:**

- `getCategories()` - Get all categories (cached)
- `getCategoryById(id)` - Get by ID
- `getCategoryTree()` - Build parent-child tree (2 levels)
- `createCategory(data)` - Create category
- `updateCategory(id, data)` - Update category
- `deleteCategory(id)` - Delete only if no products in it

**Validation:** No products in category before deletion

#### InventoryService.gs (131 LOC)

**Methods:**

- `getInventory()` - Get all inventory records (cached)
- `createInventoryForProduct(productId)` - Auto-create on product creation
- `updateQuantity(productId, qty)` - Direct quantity update
- `restock(productId, addQty)` - Atomic add quantity (LockService)
- `setMinStock(productId, min)` - Set minimum threshold
- `getLowStockProducts()` - Get items below min_stock

**Low Stock Detection:** quantity < min_stock

#### ReportService.gs (118 LOC)

**Methods:**

- `getDashboardStats()` - Total products, inventory value, low stock count
- `getLowStockReport()` - List all low stock products with details
- `getPriceHistoryReport(productId, start, end)` - Price changes timeline
- `getInventorySummaryReport()` - Inventory value by category

### Layer 3: Utilities

#### Auth.gs (78 LOC)

**Methods:**

- `getCurrentUser()` - Get email from Session.getActiveUser()
- `getUserRole(email)` - Look up role in Users sheet
- `isAdmin(email)` - Check if admin
- `requireAdmin()` - Throw if not admin (for admin-only endpoints)
- `checkAccess()` - Verify user exists in Users sheet (called by all APIs)
- `getAuthInfo()` - Return {email, role, name}

**Error Handling:** Throws Error with Vietnamese messages for invalid states

#### SheetHelper.gs (159 LOC)

**Methods:**

- `getSheet(sheetName)` - Get sheet object
- `getAll(sheetName)` - Get all rows as array of objects
- `getById(sheetName, id)` - Linear search by ID (first column)
- `create(sheetName, data)` - Create row, auto-generate UUID-based ID if needed
- `update(sheetName, id, data)` - Partial update by ID
- `remove(sheetName, id)` - Delete row by ID
- `query(sheetName, filterFn)` - Filter array via callback
- `generateId(prefix)` - Generate ID: {prefix}{12-char-uuid}

**ID Generation:** `Utilities.getUuid()` + remove hyphens + substr first 12

#### CacheHelper.gs (108 LOC)

**Methods:**

- `get(key)` - Retrieve from cache (handles chunks)
- `set(key, data, ttl)` - Store in cache (auto-chunks >90KB)
- `remove(key)` - Delete cache entries & cleanup chunks
- `invalidate(prefix)` - Remove by prefix (non-functional, just removes key)

**Chunking Strategy:**

- Chunk size: 90KB (safe under 100KB CacheService limit)
- Stores `{key}_count` to track chunk count
- Stores `{key}_chunk_0`, `{key}_chunk_1`, etc.
- Handles partial cache misses gracefully

#### Config.gs (39 LOC)

**Constants:**

```javascript
SPREADSHEET_ID = '';          // User fills in after setup
APP_NAME = '...';             // From Script Properties (default: 'Quản Lý Tạp Hoá')
SHEETS = {...};               // Sheet names (6 sheets)
COLUMNS = {...};              // Column mappings per sheet
CACHE_TTL = 600;              // 10 minutes (seconds)
ROLES = {ADMIN, VIEWER};      // Role constants
ID_PREFIXES = {...};          // Prefixes for ID generation (P, PR, INV, PH, CAT)
```

## Frontend Architecture

### SPA Structure (index.html)

- Materialize CSS CDN + custom styles
- Meta viewport tag (responsive)
- Nav header with logo, user info, logout
- Sidenav with menu (Products, Categories, Inventory, Dashboard, Reports)
- Main content area for pages
- Server-side includes for each page

**Routing:** Hash-based (#/products, #/inventory, etc.)

### State Manager & API (app.js.html, 184 LOC)

**API Wrapper:**

```javascript
api.call("apiGetProducts", []).then((result) => {
  if (result.success) {
    /* use result.data */
  } else {
    /* show error result.error */
  }
});
```

**State Manager:**

- `app.state.currentUser` - Cached user info
- `app.state.products` - Cached product list
- `app.state.categories` - Cached category tree
- etc.

**Router:**

```javascript
app.router.on("products", showProductsPage);
app.router.on("inventory", showInventoryPage);
// Hash-based routing via hashchange event
```

**Utilities:**

- `formatCurrency(value)` - Format to Vietnamese Dong (₫)
- `escapeHtml(text)` - XSS prevention
- `validateForm(formSelector)` - Client-side validation

### Pages (UI Components)

#### products.html (277 LOC)

- Table: id, name, category, unit, barcode, buy_price, sell_price
- Search bar (client-side filter)
- Filter by category dropdown
- Add Product modal
- Edit Product modal
- Price Edit modal (separate action)
- Delete with confirmation
- Admin-only: add/edit/delete buttons

#### categories.html (135 LOC)

- Category tree list (parent/child visualization)
- Add Category modal
- Edit Category modal
- Delete with confirmation (validates no products)
- Admin-only buttons

#### inventory.html (180 LOC)

- Inventory table: product, quantity, min_stock, last_restock
- Summary cards: total products, total value (VND), low stock count
- Low stock visual indicator (red badge)
- Restock modal (add quantity)
- Set Min Stock modal
- Admin-only edit buttons

#### dashboard.html (91 LOC)

- Stats cards: total products, inventory value (₫), low stock count
- Low stock warning list (clickable links to products)
- Recent changes timeline
- Refresh stats button
- Real-time updates on page load

#### reports.html (170 LOC)

- Tab 1: Low Stock Report (table with details)
- Tab 2: Price History (product selector, date range, chart)
- Tab 3: Inventory Summary (table by category, totals)
- Export buttons (CSV/Print) - not yet implemented in v1
- Admin-only: some filters

### Styling (styles.css.html, 26 LOC)

- Override Materialize defaults
- Custom color scheme (blue primary, orange accent)
- Responsive table styles
- Modal customization
- @media queries for mobile (<768px)

## Data Flow

### Create Product Flow

```bash
products.html form
  ↓ (submit)
api.call('apiCreateProduct', data)
  ↓ (google.script.run)
Code.gs: apiCreateProduct(data)
  ↓
ProductService.createProduct(data)
  ↓ (validates, creates product)
SheetHelper.create(SHEETS.PRODUCTS, ...)
  ↓ (appends row, generates ID)
PriceService.createPrice(id, buyPrice, sellPrice)
  ↓
InventoryService.createInventoryForProduct(id)
  ↓ (creates price & inventory rows)
CacheHelper.remove('products', 'products_with_prices')
  ↓ (invalidates cache)
Return {success, data: product}
  ↓ (callback)
app.state.products = [..., product]
products.html table updated
```

### Update Price Atomic Flow

```bash
products.html Price Edit modal
  ↓ (submit)
api.call('apiUpdatePrice', [productId, buyPrice, sellPrice])
  ↓
Code.gs: apiUpdatePrice(...)
  ↓
PriceService.updatePrice(...)
  ↓
LockService.lock()
  ↓ (acquire lock)
SheetHelper.update(SHEETS.PRICES, ...)
  ↓ (update price row)
SheetHelper.create(SHEETS.PRICE_HISTORY, {old_buy, new_buy, ...})
  ↓ (log change)
LockService.releaseLock()
  ↓ (release lock)
CacheHelper.remove('prices')
```

### Dashboard Load Flow

```bash
dashboard.html page load
  ↓
api.call('apiGetDashboardStats')
api.call('apiGetLowStock')
  ↓ (parallel calls)
Code.gs: apiGetDashboardStats(), apiGetLowStock()
  ↓
ReportService.getDashboardStats()
  ↓ (check cache: hit → return cached data)
  ↓ (cache miss → calculate from sheets)
ProductService.getProducts() [cached]
InventoryService.getInventory() [cached]
PriceService.getPrices() [cached]
  ↓ (build stats object)
CacheHelper.set('dashboard_stats', data, 600)
  ↓ (cache for 10 minutes)
Return {success, data: stats}
  ↓
dashboard.html: update stats cards + warning list
```

## Database Schema

### Products Sheet

| Column      | Type    | Notes                                  |
| ----------- | ------- | -------------------------------------- |
| id          | string  | P{uuid}, auto-generated                |
| name        | string  | Unique (case-insensitive, active only) |
| category_id | string  | FK to Categories.id, optional          |
| unit        | string  | 'kg', 'liter', 'piece', etc.           |
| barcode     | string  | Optional, may be empty                 |
| description | string  | Optional notes                         |
| status      | string  | 'active' or 'inactive' (soft delete)   |
| created_at  | ISO8601 | Immutable                              |
| updated_at  | ISO8601 | Updated on any change                  |

### Prices Sheet

| Column     | Type    | Notes                    |
| ---------- | ------- | ------------------------ |
| id         | string  | PR{uuid}                 |
| product_id | string  | FK to Products.id        |
| buy_price  | number  | Cost, >= 0               |
| sell_price | number  | Retail, >= 0             |
| updated_at | ISO8601 | Updated by updatePrice() |
| updated_by | string  | Email of updater         |

### Inventory Sheet

| Column       | Type    | Notes                            |
| ------------ | ------- | -------------------------------- |
| id           | string  | INV{uuid}                        |
| product_id   | string  | FK to Products.id                |
| quantity     | number  | Current stock                    |
| min_stock    | number  | Reorder point                    |
| last_restock | ISO8601 | Timestamp of last restock() call |
| updated_at   | ISO8601 | Updated on any change            |

### PriceHistory Sheet

| Column     | Type    | Notes                      |
| ---------- | ------- | -------------------------- |
| id         | string  | PH{uuid}                   |
| product_id | string  | FK to Products.id          |
| old_buy    | number  | Previous buy price         |
| new_buy    | number  | New buy price              |
| old_sell   | number  | Previous sell price        |
| new_sell   | number  | New sell price             |
| changed_at | ISO8601 | Timestamp of change        |
| changed_by | string  | Email of admin who changed |

### Categories Sheet

| Column     | Type    | Notes                               |
| ---------- | ------- | ----------------------------------- |
| id         | string  | CAT{uuid}                           |
| name       | string  | Category name                       |
| parent_id  | string  | FK to Categories.id, empty for root |
| created_at | ISO8601 | Immutable                           |

### Users Sheet

| Column     | Type    | Notes                     |
| ---------- | ------- | ------------------------- |
| email      | string  | Primary key, Google email |
| name       | string  | User display name         |
| role       | string  | 'admin' or 'viewer'       |
| created_at | ISO8601 | Date added to system      |

## Dependencies

**No npm packages required** - all GAS/browser native APIs:

- `SpreadsheetApp` - Google Sheets API
- `HtmlService` - Frontend templating
- `CacheService` - In-memory cache
- `LockService` - Atomic operations
- `Session` - User identity
- `Utilities` - UUID generation
- `Logger` - Debug logging

## Code Patterns

### IIFE Service Pattern

```javascript
var ServiceName = (function() {
  // Private functions
  function _privateHelper() { ... }

  // Public API
  return {
    publicMethod: publicMethod,
    anotherMethod: anotherMethod
  };
})();
```

### Error Handling

```javascript
try {
  Auth.checkAccess(); // Authorization gate
  // perform operation
  return { success: true, data: result };
} catch (e) {
  Logger.log("Error: " + e.message);
  return { success: false, error: e.message };
}
```

### Caching Pattern

```javascript
var cached = CacheHelper.get("products");
if (cached) return cached;

var data = SheetHelper.getAll(SHEETS.PRODUCTS);
CacheHelper.set("products", data, CACHE_TTL);
return data;
```

### Atomic Operations

```javascript
LockService.lock();
try {
  // Update price
  SheetHelper.update(SHEETS.PRICES, ...);
  // Log to history
  SheetHelper.create(SHEETS.PRICE_HISTORY, ...);
} finally {
  LockService.releaseLock();
}
```

## Performance Notes

### Cache Strategy

- All `get*` methods cached (10 minutes)
- Caches invalidated on create/update/delete
- Chunked for large datasets (>100KB)
- Cache misses fall back to sheets (no data loss)

### Scalability

- Linear search in getById() acceptable for <10K records
- Bulk operations recommended for >100 items
- PriceHistory sheet recommended to split after 5+ years data

### Optimization Opportunities

1. Implement `getByIdMap()` for faster lookups
2. Add pagination to large reports
3. Implement server-side filtering (not done in v1)
4. Consider batch sheet reads with SpreadsheetApp.getValues()

## Testing Notes

**Manual Testing:**

- Create product → verify price & inventory auto-created
- Update price → verify locked, history logged
- Soft delete product → verify status changed, not removed
- Cache invalidation → verify next request reads from sheets
- Low stock detection → verify alert appears

**No unit tests in v1** - GAS doesn't support Jest/Mocha easily. Consider adding in future.

## Deployment Info

- **File:** appsscript.json
- **Runtime:** V8 (ES6+)
- **Timezone:** Asia/Ho_Chi_Minh
- **Web App Execute As:** User accessing the web app
- **Script ID:** User fills in after first deploy

See [deployment-guide.md](./deployment-guide.md) for setup.
