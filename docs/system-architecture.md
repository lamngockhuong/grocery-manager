# System Architecture

## High-Level Architecture

```bash
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Client)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Single Page Application (SPA)               │   │
│  │  ┌─────────────┬──────────────┬──────────────────────┐   │   │
│  │  │  HTML/CSS   │  JavaScript  │    State Manager     │   │   │
│  │  │ (Materialize)│  (Vanilla)  │   (app.js.html)      │   │   │
│  │  └─────────────┴──────────────┴──────────────────────┘   │   │
│  │                                                          │   │
│  │  Hash Router: #/products, #/inventory, #/dashboard       │   │
│  │  API: google.script.run (async XMLHttpRequest)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                  ↑ ↓                            │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                    google.script.run RPC Layer
                                   │
┌──────────────────────────────────┼──────────────────────────────┐
│                 Google Apps Script (Server)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Code.gs (Entry Point)                   │   │
│  │  doGet() → SPA Shell                                     │   │
│  │  apiGetProducts, apiCreateProduct, ... (20 wrappers)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Service Layer (IIFE)                   │   │
│  │  ┌────────────────┬──────────────┬─────────────────────┐ │   │
│  │  │ ProductService │ PriceService │ CategoryService     │ │   │
│  │  │ InventoryServ. │ ReportService│                     │ │   │
│  │  └────────────────┴──────────────┴─────────────────────┘ │   │
│  │                                                          │   │
│  │  (Business Logic, Validation, Cache Invalidation)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Utility Layer                           │   │
│  │  ┌────────────┬────────────┬─────────────────────────┐   │   │
│  │  │ Auth.gs    │SheetHelper │ CacheHelper.gs          │   │   │
│  │  │(RBAC)      │(Generic    │(Chunked Cache)          │   │   │
│  │  │            │ CRUD)      │Config.gs (Const)        │   │   │
│  │  └────────────┴────────────┴─────────────────────────┘   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Google APIs                                 │   │
│  │  SpreadsheetApp │ CacheService │ Session │ LockService   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│           Google Sheets (Persistent Data Storage)               │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │  Products    │  Prices      │  Inventory  │  Categories    │ │
│  │  (500-2K)    │  (500-2K)    │  (500-2K)   │  (50-100)      │ │
│  └──────────────┴──────────────┴──────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PriceHistory (Unbounded Audit Trail) │ Users (5-20)      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

```bash
app.js.html (Core)
├── API Wrapper
│   └── api.call(functionName, args)
│       └── google.script.run async RPC
├── State Manager
│   └── app.state: currentUser, products, prices, categories, inventory
├── Router
│   └── Hash-based (#/products, #/categories, #/inventory, #/dashboard, #/reports)
└── Utils
    ├── formatCurrency(value) → "100.000 ₫"
    ├── escapeHtml(text) → Prevent XSS
    ├── validateForm(selector) → Client-side validation
    └── toSlug(str) → Vietnamese name to kebab-case filename slug

UI Pages (Materialize CSS)
├── products.html
│   ├── Product table (search, filter by category)
│   ├── Column sorting (ASC/DESC/none) + pagination (25/page)
│   ├── Add Product modal (with image upload)
│   ├── Edit Product modal (with image preview/edit)
│   ├── Product Detail modal (shows image preview)
│   ├── Product Image UI (file upload, camera capture, URL paste, compression)
│   ├── Barcode Scanner (camera-based, QuaggaJS)
│   ├── Google Price Search button (opens Google search in new tab)
│   └── Price Edit modal (atomic, LockService-protected)
├── categories.html
│   ├── Category tree view
│   ├── Add/Edit/Delete modals
│   └── Validation (no products before delete)
├── inventory.html
│   ├── Inventory table with low stock indicators
│   ├── Column sorting (ASC/DESC/none) + pagination (25/page)
│   ├── Restock modal (atomic, with optional note)
│   ├── Set Min Stock modal
│   └── Summary cards (total value, low stock count)
├── dashboard.html
│   ├── Stats cards (refresh on page load)
│   ├── Low stock warnings (linked to products)
│   └── Recent changes timeline
└── reports.html
    ├── Tab 1: Low Stock Report (column sorting)
    ├── Tab 2: Price History (product, date range, bold changed prices)
    └── Tab 3: Inventory Summary (by category, column sorting)
```

### Backend Service Layers

```bash
Code.gs (API Gateway)
├── doGet(e) → Returns SPA shell (index.html)
├── include(filename) → Server-side includes for HTML
├── setupSheets() → One-time initialization
└── API Wrappers (23 functions)
    ├── Auth: apiGetAuthInfo()
    ├── Products: apiGetProducts, apiCreateProduct, apiUpdateProduct,
    │            apiDeleteProduct, apiSearchProducts
    ├── Prices: apiUpdatePrice, apiGetPriceHistory
    ├── Categories: apiGetCategories, apiCreateCategory,
    │              apiUpdateCategory, apiDeleteCategory
    ├── Inventory: apiGetInventory, apiUpdateQuantity, apiRestock,
    │             apiSetMinStock, apiGetLowStock
    ├── Images: apiUploadProductImage, apiDeleteProductImage,
    │           apiCleanupOrphanImages (admin-only)
    └── Reports: apiGetDashboardStats, apiGetLowStockReport,
               apiGetPriceHistoryReport, apiGetInventorySummaryReport

Service Layer (IIFE Modules)
├── Auth.gs (92 LOC) - RBAC
│   ├── getCurrentUser() → Email from Session
│   ├── getUserRole(email) → Lookup in Users sheet
│   ├── isAdmin(email) → Check role
│   ├── requireAdmin() → Throw if not admin
│   ├── checkAccess() → Verify user in system (called by ALL APIs)
│   └── getAuthInfo() → {email, role, name}
├── ProductService.gs (235 LOC) - Product CRUD
│   ├── getProducts() [cached]
│   ├── getProductById(id)
│   ├── createProduct(data) → Auto-creates price & inventory
│   ├── updateProduct(id, data) → Delegates price to PriceService, handles image_url
│   ├── updateImageUrl(id, imageUrl) → Update only image_url, delete old
│   ├── deleteProduct(id) → Soft delete
│   ├── searchProducts(keyword)
│   ├── filterByCategory(categoryId)
│   ├── getProductsWithPrices() [cached JOIN]
│   └── bulkUpdateStatus(ids, status)
├── PriceService.gs (142 LOC) - Price CRUD + History
│   ├── getPrices() [cached]
│   ├── createPrice(productId, buy, sell)
│   ├── updatePrice(productId, buy, sell) [atomic with LockService]
│   │   └── Auto-logs to PriceHistory (tracks old/new, timestamp, user)
│   └── getPriceHistory(productId, start, end) [date-filtered]
├── CategoryService.gs (122 LOC) - Category CRUD
│   ├── getCategories() [cached]
│   ├── getCategoryById(id)
│   ├── getCategoryTree() → Build parent-child tree structure
│   ├── createCategory(data)
│   ├── updateCategory(id, data)
│   └── deleteCategory(id) [validates no products]
├── InventoryService.gs (143 LOC) - Inventory CRUD + Restock
│   ├── getInventory() [cached]
│   ├── createInventoryForProduct(productId)
│   ├── updateQuantity(productId, qty)
│   ├── restock(productId, addQty, note) [atomic with LockService, optional note]
│   ├── setMinStock(productId, min)
│   └── getLowStockProducts() [quantity < min_stock]
├── ReportService.gs (139 LOC) - Analytics
│   ├── getDashboardStats() → Total products, inventory value, low stock
│   ├── getLowStockReport() → All low stock items with details
│   ├── getPriceHistoryReport(productId, start, end) → Timeline
│   └── getInventorySummaryReport() → Inventory value by category
└── ImageService.gs (91 LOC) - Product Images
    ├── uploadImage(base64Data, fileName, mimeType) → Google Drive storage
    │   └── Returns thumbnail URL: https://drive.google.com/thumbnail?id=FILE_ID&sz=w800
    ├── deleteImage(imageUrl) → Move to trash
    └── cleanupOrphanImages() → Trash unreferenced Drive files (admin-triggered, user-scoped)

Utility Layer
├── SheetHelper.gs (169 LOC) - Generic CRUD
│   ├── getSheet(sheetName) → Sheet object
│   ├── getAll(sheetName) → All rows as objects
│   ├── getById(sheetName, id) → Linear search, O(n)
│   ├── create(sheetName, data) → Append row, auto-generate ID
│   ├── update(sheetName, id, data) → Partial update
│   ├── remove(sheetName, id) → Delete row
│   ├── query(sheetName, filterFn) → Filter via callback
│   └── generateId(prefix) → UUID-based ID
├── CacheHelper.gs (109 LOC) - Smart Caching
│   ├── get(key) → Retrieve (handles chunks)
│   ├── set(key, data, ttl) → Store (auto-chunks >90KB)
│   ├── remove(key) → Delete (cleans up chunks)
│   └── invalidate(prefix) → Remove by prefix
├── Auth.gs - See above
└── Config.gs (92 LOC) - Constants
    ├── SPREADSHEET_ID
    ├── APP_NAME: From Script Properties (default: 'Quản Lý Tạp Hoá')
    ├── SHEETS: {PRODUCTS, PRICES, INVENTORY, PRICE_HISTORY, USERS, CATEGORIES}
    ├── COLUMNS: Column mappings per sheet
    ├── CACHE_TTL: 10 minutes
    ├── ROLES: {ADMIN, VIEWER}
    └── ID_PREFIXES: {P, PR, INV, PH, CAT}
```

## Data Flow Diagrams

### Product Creation Flow (Atomic)

```bash
User clicks "Add Product"
     ↓
products.html form
     ↓
api.call('apiCreateProduct', [data])
     ↓ (google.script.run RPC)
Code.gs: apiCreateProduct(data)
     ↓
try {
  Auth.checkAccess()           ← Authorization gate
     ↓
  ProductService.createProduct(data)
     ↓
    Validate (name, unit, category, prices, uniqueness)
     ↓
    SheetHelper.create(SHEETS.PRODUCTS, {id, name, category_id, unit, ...})
     ↓
    product = {id: 'P1234...', name, ...}
     ↓
    PriceService.createPrice(product.id, buyPrice, sellPrice)
     ↓
    InventoryService.createInventoryForProduct(product.id)
     ↓
    CacheHelper.remove('products', 'products_with_prices')  ← Invalidate
     ↓
    return product
  ↓
} catch (e) {
  return {success: false, error: e.message}
}
     ↓ (callback)
app.state.products.push(newProduct)
     ↓
products.html: Insert row in table, close modal, show toast
```

### Price Update Flow (Atomic with Lock)

```bash
User clicks "Edit Price"
     ↓
products.html Price Edit modal
     ↓
api.call('apiUpdatePrice', [productId, buyPrice, sellPrice])
     ↓ (google.script.run RPC)
Code.gs: apiUpdatePrice(productId, buyPrice, sellPrice)
     ↓
try {
  Auth.checkAccess()
     ↓
  PriceService.updatePrice(productId, buyPrice, sellPrice)
     ↓
  LockService.lock()  ← Acquire exclusive lock
     ↓
  try {
    oldPrice = SheetHelper.getById(SHEETS.PRICES, productId)
    ↓
    SheetHelper.update(SHEETS.PRICES, productId, {
      buy_price: buyPrice,
      sell_price: sellPrice,
      updated_at: now,
      updated_by: currentUser
    })
    ↓
    SheetHelper.create(SHEETS.PRICE_HISTORY, {
      product_id: productId,
      old_buy: oldPrice.buy_price,
      new_buy: buyPrice,
      old_sell: oldPrice.sell_price,
      new_sell: sellPrice,
      changed_at: now,
      changed_by: currentUser
    })
    ↓
    CacheHelper.remove('prices')  ← Invalidate
  } finally {
    LockService.releaseLock()  ← Release lock
  }
     ↓
  return {success: true, data: updatedPrice}
}
     ↓ (callback)
app.state.prices[productId] = {buyPrice, sellPrice, ...}
     ↓
products.html: Update row in table, close modal, show toast
```

### Dashboard Load Flow (With Cache)

```bash
User navigates to dashboard (#/dashboard)
     ↓
dashboard.html: init()
     ↓
api.call('apiGetDashboardStats')
api.call('apiGetLowStock')  ← Parallel
     ↓ (google.script.run RPC)
Code.gs: apiGetDashboardStats(), apiGetLowStock()
     ↓
ReportService.getDashboardStats()
     ↓
Check: CacheHelper.get('dashboard_stats')
     ↓
Cache HIT? → return cached data (10s response time)
     ↓
Cache MISS? → Calculate:
     ↓
    var products = ProductService.getProducts()  [cached]
    var inventory = InventoryService.getInventory()  [cached]
    var prices = PriceService.getPrices()  [cached]
    ↓
    Count: total products = products.length
    Sum: inventory value = SUM(quantity × sell_price)
    Count: low stock = inventory.filter(qty < min_stock).length
    ↓
    stats = {totalProducts, inventoryValue, lowStockCount}
    ↓
    CacheHelper.set('dashboard_stats', stats, 600)  [10-min TTL]
    ↓
    return stats (3s response time for cache miss)
     ↓ (callback)
dashboard.html: render stats cards
     ↓
Subsequent page loads (within 10 min): ← Cache hits, 10s load time
```

## Caching Strategy

### Cache Keys & TTL

| Cache Key            | Data                  | TTL   | Invalidated By                     |
| -------------------- | --------------------- | ----- | ---------------------------------- |
| products             | All active products   | 10min | create/update/delete product       |
| prices               | All prices            | 10min | update price                       |
| categories           | All categories        | 10min | create/update/delete category      |
| inventory            | All inventory records | 10min | update inventory/restock           |
| products_with_prices | Joined data (JOIN)    | 10min | create/update product OR price     |
| dashboard_stats      | Stats object          | 10min | Any product/price/inventory change |
| ... (others)         | ...                   | ...   | ...                                |

### Chunking Strategy (>100KB)

Google CacheService limit: 100KB per key

**CacheHelper Solution:**

- CHUNK_SIZE = 90KB (safe margin)
- If JSON ≤ 90KB: store as single key
- If JSON > 90KB: split into chunks
  - Store chunks: `{key}_chunk_0`, `{key}_chunk_1`, ...
  - Store count: `{key}_count` = number of chunks
  - On retrieve: reassemble chunks, JSON.parse()

**Example:**

```bash
Large data (250KB) → 3 chunks:
  {key}_chunk_0 (90KB)
  {key}_chunk_1 (90KB)
  {key}_chunk_2 (70KB)
  {key}_count = 3

retrieve → get all 3 chunks → concatenate → parse JSON
```

## Authorization & Authentication Flow

```bash
1. User opens web app
     ↓
   Session.getActiveUser().getEmail()  ← Google OAuth token
     ↓
2. Frontend calls api.call('apiGetAuthInfo')
     ↓
3. Code.gs: apiGetAuthInfo()
     ↓
4. Auth.getCurrentUser()
     ↓
5. Session.getActiveUser().getEmail()  ← Get email from token
     ↓
6. SheetHelper.getAll(SHEETS.USERS)
     ↓
7. Find user by email in Users sheet
     ↓
8. If found:
     ├─ Return {email, role, name}
     └─ Frontend shows user name in navbar
   If NOT found:
     └─ Throw "Tài khoản không có quyền truy cập"
     ↓
9. All subsequent API calls start with Auth.checkAccess()
     ↓
10. For admin-only endpoints: Auth.requireAdmin()
     ├─ If admin → proceed
     └─ If viewer → throw "Không có quyền"
```

### User Roles

**Admin (admin):**

- Full CRUD on all entities
- Can create/update/delete users (future)
- Can access all reports
- Atomic price updates via LockService

**Viewer (viewer):**

- Read-only access to all data
- No edit/delete buttons in UI
- Server-side: all mutations rejected
- Can view all reports

## Database Schema & Relationships

```bash
┌─────────────────┐         ┌──────────────────┐
│   Categories    │         │    Products      │
├─────────────────┤         ├──────────────────┤
│ id (CAT...)     │◄────────│ id (P...)        │
│ name            │         │ name             │
│ parent_id (FK)  │         │ category_id (FK) │
│ created_at      │         │ unit             │
│                 │         │ barcode          │
│                 │         │ description      │
│                 │         │ image_url        │
│                 │         │ status           │
│                 │         │ created_at       │
│                 │         │ updated_at       │
└─────────────────┘         └────────┬─────────┘
         ▲                           │
         │ (self-join, parent_id)    │
         │                           │
         │                           ▼
    Prices & Inventory         ┌──────────────────┐
    join via product_id        │     Prices       │
                               ├──────────────────┤
                               │ id (PR...)       │
                               │ product_id (FK)  │
                               │ buy_price        │
                               │ sell_price       │
                               │ updated_at       │
                               │ updated_by (FK)  │
                               └────────┬─────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
        ┌──────────────────────┐          ┌─────────────────────────┐
        │     Inventory        │          │    PriceHistory (Audit) │
        ├──────────────────────┤          ├─────────────────────────┤
        │ id (INV...)          │          │ id (PH...)              │
        │ product_id (FK)      │          │ product_id (FK)         │
        │ quantity             │          │ old_buy                 │
        │ min_stock            │          │ new_buy                 │
        │ last_restock         │          │ old_sell                │
        │ restock_note         │          │ new_sell                │
        │ updated_at           │          │ changed_at              │
        └──────────────────────┘          │ changed_by (FK)         │
                                          └─────────────────────────┘

┌──────────────────┐
│      Users       │
├──────────────────┤
│ email (PK)       │
│ name             │
│ role (admin/viewer)
│ created_at       │
└──────────────────┘
```

**Foreign Keys:**

- Products.category_id → Categories.id
- Prices.product_id → Products.id
- Inventory.product_id → Products.id
- PriceHistory.product_id → Products.id
- PriceHistory.changed_by → Users.email
- Prices.updated_by → Users.email

**No CASCADE deletes** - Manual validation (e.g., CategoryService checks no products before delete)

## Concurrency & Locking

### LockService Usage

**Price Updates (CRITICAL):**

```javascript
// Without lock: Race condition possible
// Two concurrent updates could overwrite each other
// PriceHistory might miss an update

// With lock: Atomic
LockService.lock();
try {
  update price
  log to history
} finally {
  LockService.releaseLock();
}
```

**Inventory Restock (CRITICAL):**

```javascript
LockService.lock();
try {
  add to quantity
  update timestamp
} finally {
  LockService.releaseLock();
}
```

**Lock Behavior:**

- Blocking: Waits for lock release (GAS handles queueing)
- Timeout: 30 seconds default (GAS limit)
- Per-script cache: No cross-script locks

## Performance Characteristics

### Read Operations (Cached)

| Operation           | Time (Cache Hit) | Time (Cache Miss) | Limit      |
| ------------------- | ---------------- | ----------------- | ---------- |
| getProducts()       | <100ms           | 1-2s              | 2,000 SKUs |
| getDashboardStats() | <100ms           | 2-3s              | -          |
| getPriceHistory()   | <100ms           | 1-2s              | Unbounded  |
| getInventory()      | <100ms           | 1-2s              | 2,000 SKUs |

### Write Operations (No Caching)

| Operation       | Time | Notes                             |
| --------------- | ---- | --------------------------------- |
| createProduct() | 2-3s | Creates product, price, inventory |
| updatePrice()   | 1-2s | Locked, logs to history           |
| restock()       | 1-2s | Locked                            |
| deleteProduct() | 1s   | Soft delete                       |

### System Limits

| Limit         | Value                 | Risk                             |
| ------------- | --------------------- | -------------------------------- |
| GAS Execution | 6 minutes             | Timeout on bulk operations       |
| API Rate      | 100 req/100s per user | Throttling for rapid clicks      |
| Sheet Cells   | 10 million            | ~2,000 products sustainable      |
| CacheService  | 100KB per key         | Handled via chunking             |
| LockService   | 30s timeout           | Atomic ops must complete quickly |

## Security Architecture

### Authentication

- **Provider:** Google OAuth (via Session.getActiveUser())
- **Deploy Config:** Execute as: "User accessing the web app"
- **User Identification:** Email address
- **User Lookup:** Users sheet lookup (allowlist model)

### Authorization

- **Model:** Role-Based Access Control (RBAC)
- **Roles:** admin, viewer
- **Enforcement:** Server-side (in Code.gs API wrappers)
- **CRITICAL:** All mutations protected by Auth.checkAccess() + Auth.requireAdmin()

### Data Protection

- **Sensitive Data:** Only in backend (never in JavaScript)
- **XSS Prevention:** escapeHtml() + textContent for dynamic content
- **SQL Injection:** N/A (Sheets, not SQL)
- **CSRF:** Handled by google.script.run (same-origin only)

## Deployment Architecture

```bash
Developer Machine
     ↓
Google Apps Script Editor (script.google.com)
     OR clasp (local CLI)
     ↓
GAS Project (stored in Google Drive)
     ↓
Deploy: Create Web App
     ├─ Execute as: User accessing app
     ├─ Who has access: Anyone, Org, Domain, etc.
     └─ Get deployment URL
     ↓
Shared deployment URL
     ↓
Users open in browser
     ↓
Runs in Google Cloud (CDN-backed)
```

**No external hosting:** Google handles servers, scaling, redundancy.

## Scalability Analysis

### Horizontal (More Users)

- **Concurrent Users:** Hundreds supported (Google Cloud infrastructure)
- **API Rate Limit:** 100 req/100s per user (GAS limit)
- **CacheService:** Per-script (shared across users in same deployment)
- **Data Contention:** LockService handles concurrent price/restock updates

### Vertical (More Products)

- **Product Limit:** 2,000 SKUs tested, sustainable
- **Beyond 2,000:** Consider:
  - Migrate PriceHistory to separate sheet (after 5+ years)
  - Implement server-side pagination
  - Optimize SheetHelper.getById() with map-based lookup

### Data Growth

| Data         | Rate                          | Storage                |
| ------------ | ----------------------------- | ---------------------- |
| Products     | ~100/month (new)              | ~50KB (2,000 items)    |
| Prices       | Rare (only on product create) | ~50KB                  |
| Inventory    | Unbounded (restocks daily)    | ~50KB                  |
| PriceHistory | ~10/day (avg)                 | ~1MB/year (grows fast) |

**PriceHistory Strategy:**

- Archive to separate sheet after 5 years
- Or: Accept growing sheet (10M cells limit = ~100K items sustainable)
- Or: Implement cleanup job (delete entries >5 years old)

## Technology Choices & Rationale

| Component | Technology         | Why                                             |
| --------- | ------------------ | ----------------------------------------------- |
| Backend   | Google Apps Script | Tight integration with Sheets, free, no hosting |
| Frontend  | Vanilla JS + HTML5 | No build step, CDN via GAS, simple deployment   |
| Styling   | Materialize CSS    | Responsive, mobile-friendly, no configuration   |
| Database  | Google Sheets      | Owned by user, easy to inspect, familiar format |
| Caching   | CacheService       | Built-in, simple API, 10-min default TTL        |
| Locking   | LockService        | Built-in, handles race conditions               |
| Auth      | Google OAuth       | User's existing Google account, free            |

### Trade-offs

**Advantages:**

- Zero hosting costs
- No ops burden (Google manages infrastructure)
- Easy to understand (Sheets are transparent)
- User owns all data (in their Drive)

**Disadvantages:**

- 6-minute execution timeout (max)
- Limited by Sheets API performance
- No complex queries (SQL-like)
- IIFE modules instead of proper imports
- No unit testing framework available
