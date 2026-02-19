# Code Review: Grocery Manager (GAS + Google Sheets)

## Scope
- **Files**: 19 (10 backend .gs, 8 frontend .html, 1 config json)
- **LOC**: ~1,150
- **Focus**: Full codebase review

## Overall Assessment

Solid first implementation for a GAS-based grocery management app. Clean modular architecture with IIFE modules, consistent API wrapper pattern, and reasonable separation of concerns. However, there are **critical auth bypass vulnerabilities**, several data integrity risks, and missing input sanitization that need immediate attention.

---

## Critical Issues

### C1. Auth Bypass on Mutating API Endpoints

**Impact**: Any authenticated user (viewer role) can create/update/delete products, categories, and inventory.

In `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/Code.gs`, the following API wrappers are **missing `Auth.checkAccess()`** entirely:

```javascript
// Lines 88-94: apiCreateProduct - NO auth check at all
function apiCreateProduct(data) {
  try {
    return { success: true, data: ProductService.createProduct(data) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

The same pattern repeats for:
- `apiUpdateProduct` (line 96) - no `Auth.checkAccess()`
- `apiDeleteProduct` (line 104) - no `Auth.checkAccess()`
- `apiCreateCategory` (line 149) - no `Auth.checkAccess()`
- `apiUpdateCategory` (line 157) - no `Auth.checkAccess()`
- `apiDeleteCategory` (line 165) - no `Auth.checkAccess()`
- `apiUpdatePrice` (line 122) - no `Auth.checkAccess()`
- `apiUpdateQuantity` (line 183) - no `Auth.checkAccess()`
- `apiRestock` (line 191) - no `Auth.checkAccess()`
- `apiSetMinStock` (line 199) - no `Auth.checkAccess()`

**Mitigation**: The service-layer functions (e.g., `ProductService.createProduct`) do call `Auth.requireAdmin()`, so admin-only ops are protected there. But if a non-registered user somehow calls these endpoints, the service-level check throws an error (which is caught and returned as `{success: false}`). This is defense-in-depth working, but the API layer should be consistent.

**Fix**: Add `Auth.checkAccess()` as the first line of every `api*` function. This ensures unregistered users are rejected at the gateway level uniformly.

### C2. XFrameOptions Set to ALLOWALL

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/Code.gs`, line 11

```javascript
.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
```

This allows the app to be embedded in any iframe, enabling clickjacking attacks. An attacker can embed the app in a malicious page and trick admins into performing actions.

**Fix**: Remove this line or use `HtmlService.XFrameOptionsMode.DEFAULT` unless iframe embedding is a hard requirement.

---

## High Priority

### H1. Race Condition in Inventory Restock

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/InventoryService.gs`, lines 63-78

```javascript
function restock(productId, addQuantity) {
  var record = _findInventoryRecord(productId);  // Read
  var currentQty = Number(record.quantity) || 0;
  SheetHelper.update(SHEETS.INVENTORY, record.id, {
    quantity: currentQty + addQuantity,  // Write (non-atomic)
  });
}
```

Two concurrent restocks could read the same `currentQty` and lose one update. In GAS, concurrent executions are common with multiple users.

**Fix**: Use `LockService.getScriptLock()` to serialize writes:
```javascript
var lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
  // read + write
} finally {
  lock.releaseLock();
}
```

### H2. Race Condition in Price Update

Same non-atomic read-then-write pattern in `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/PriceService.gs`, lines 40-79. Two concurrent price updates can overwrite each other and log incorrect history.

### H3. ID Collision Risk

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/SheetHelper.gs`, line 42

```javascript
function generateId(prefix) {
  return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}
```

`Date.now()` + 4 random chars gives low entropy. Concurrent calls within the same millisecond + birthday problem on 4 chars (36^4 = ~1.7M) creates realistic collision risk for a multi-user app.

**Fix**: Use `Utilities.getUuid()` which is available in GAS and guarantees uniqueness.

### H4. Stale Cache Serving Incorrect Data

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/Config.gs`, line 26

```javascript
var CACHE_TTL = 21600; // 6 hours
```

6-hour TTL means one user's writes may not be visible to other users for up to 6 hours since `CacheService.getScriptCache()` is shared across all users. Cache is invalidated on write operations (good), but if a write fails after cache invalidation, or if there is a partial failure in `createProduct` (product created but price/inventory creation fails), the cache state becomes inconsistent.

**Fix**: Reduce TTL to 300-600 seconds. Add try/catch around cache invalidation so write operations are not affected by cache failures.

### H5. No Input Length Validation

No maximum length checks on any text fields (product name, description, barcode, category name). A malicious or careless user could submit very large strings that:
- Exhaust the 100KB cache chunk limit
- Create extremely large spreadsheet cells
- Cause slow rendering on the frontend

**Fix**: Add `MAX_LENGTH` constants and validate in service layer (e.g., name <= 200 chars, description <= 1000 chars).

---

## Medium Priority

### M1. Product Creation Non-Atomic (Partial Failure)

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/ProductService.gs`, lines 57-63

```javascript
var product = SheetHelper.create(SHEETS.PRODUCTS, record);
PriceService.createPrice(product.id, buyPrice, sellPrice);        // If this fails...
InventoryService.createInventoryForProduct(product.id);            // ...orphan product remains
```

If `createPrice` or `createInventoryForProduct` throws, a product row exists without corresponding price/inventory rows. No rollback mechanism.

**Fix**: Wrap in try/catch, delete the product row on failure, or add a health-check function that detects orphan records.

### M2. `getAll()` Performance Concern for 2000 SKU

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/SheetHelper.gs`, lines 46-58

Every query loads all rows into memory. At 2000 products + 2000 prices + 2000 inventory rows, `ReportService.getDashboardStats()` calls `getProductsWithPrices()` (which loads products + prices) PLUS `getInventory()` (which loads inventory + products again). That is 4 full sheet reads if cache is cold.

Each `getAll()` uses `sheet.getRange().getValues()` which is efficient in GAS, and caching mitigates repeat calls. But `ReportService` methods load overlapping data repeatedly.

**Recommendation**: Accept current approach for 2000 SKU (within GAS limits) but be aware of 6-minute execution timeout for cold cache scenarios.

### M3. `searchProducts` Does Not Use Server-Side Search

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/products.html`, line 274

The frontend search is local-only (debounced filter on `state.products`), which is good for UX. But `apiSearchProducts` (Code.gs line 112) exists as a server-side endpoint that is never called from the frontend. Dead code.

**Fix**: Remove `apiSearchProducts` from Code.gs and `searchProducts` from ProductService.gs, or document as reserved for future barcode-scan API.

### M4. Duplicate Name Check Uses Cached Data

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/ProductService.gs`, lines 40-44

```javascript
var existing = getProducts();  // May return cached (stale) data
var dup = existing.some(function(p) {
  return p.name.toLowerCase() === data.name.trim().toLowerCase() && p.status === 'active';
});
```

If cache is stale, a duplicate product can be created. Same issue in `CategoryService.createCategory`.

**Fix**: For uniqueness checks, bypass cache and read directly from sheet: `SheetHelper.getAll(SHEETS.PRODUCTS)`.

### M5. Category `updateCategory` Allows Circular Parent Reference

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/CategoryService.gs`, lines 70-86

A category can be set as its own parent, or a child can be set as parent of its ancestor, creating circular references. The UI prevents self-reference via `_populateParentSelect(excludeId)` but does not exclude grandchildren. Server has no validation.

**Fix**: Add server-side check that `parent_id !== id` and that `parent_id` is not a descendant of `id`.

### M6. `showEmptyState` Uses innerHTML Without Escaping the Message

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/app.js.html`, line 102

```javascript
el.innerHTML = '...<p>' + message + '</p>...';
```

All current callers pass hardcoded strings, so not exploitable now. But this is an XSS vector if `message` ever comes from user input.

**Fix**: Use `escapeHtml(message)` inside `showEmptyState`.

### M7. `bulkUpdateStatus` Exposed but Not Used

**File**: `/Users/lamngockhuong/develop/projects/lamngockhuong/grocery-manager/src/ProductService.gs`, lines 152-163

`bulkUpdateStatus` is defined but has no API wrapper in Code.gs and no frontend caller. Dead code.

**Fix**: Remove or add API wrapper if planned for future use.

---

## Low Priority

### L1. `.substr()` is Deprecated
**File**: SheetHelper.gs line 42, CacheHelper.gs line 62
Use `.substring()` instead.

### L2. Inconsistent `var` vs Module Pattern
All modules use IIFE (good), but utility functions like `escapeHtml`, `formatCurrency` in app.js.html are globals. Acceptable for GAS frontend but worth noting.

### L3. Missing `<!DOCTYPE html>` on Sub-pages
The sub-page `.html` files (products.html, etc.) are included via `<?!= include() ?>` so they do not need DOCTYPE. This is correct.

### L4. No Pagination
All data loaded at once. Acceptable for 500-2000 SKU but will not scale beyond that.

### L5. Hardcoded Materialize CDN Version
`materialize@1.0.0` is pinned (good for stability), but this version has known issues with select dropdowns and is no longer maintained.

---

## Positive Observations

1. **Clean module pattern**: IIFE-based modules with clear public APIs
2. **Consistent API response format**: `{success, data, error}` pattern throughout
3. **Cache layer with chunking**: Smart handling of GAS 100KB limit
4. **Soft delete for products**: Preserves data integrity with `status: inactive`
5. **XSS protection**: `escapeHtml()` used consistently in table rendering
6. **Frontend validation + server validation**: Double validation on forms
7. **Debounced search**: 300ms debounce prevents excessive re-renders
8. **Responsive design**: Mobile sidenav, responsive tables, touch-friendly button sizes
9. **Category tree with parent-child**: Well-structured 2-level hierarchy
10. **Price history audit trail**: Automatic logging on every price change

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Add `Auth.checkAccess()` to all API wrappers in Code.gs
2. **[CRITICAL]** Change `setXFrameOptionsMode` to `DEFAULT`
3. **[HIGH]** Add `LockService` to `restock()`, `updateQuantity()`, and `updatePrice()`
4. **[HIGH]** Replace `generateId` with `Utilities.getUuid()`
5. **[HIGH]** Add input length validation (name, description, barcode)
6. **[MEDIUM]** Bypass cache for uniqueness checks in create operations
7. **[MEDIUM]** Add rollback logic or orphan detection for product creation
8. **[MEDIUM]** Add circular parent reference check in category update
9. **[MEDIUM]** Remove dead code: `apiSearchProducts`, `bulkUpdateStatus`
10. **[LOW]** Replace `.substr()` with `.substring()`
11. **[LOW]** Reduce cache TTL to 300-600 seconds

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Files | 19 |
| Total LOC | ~1,150 |
| Backend LOC | ~620 |
| Frontend LOC | ~530 |
| Auth-protected read endpoints | 9/9 (all read APIs have `checkAccess`) |
| Auth-protected write endpoints | 0/10 at API layer (service layer has `requireAdmin`) |
| XSS-escaped output | ~95% (all table renders use `escapeHtml`) |
| Dead code | 2 functions (`apiSearchProducts`, `bulkUpdateStatus`) |
| Test coverage | 0% (no tests) |
| Error handling | Consistent try/catch in all service + API layers |

---

## Unresolved Questions

1. Is iframe embedding (`ALLOWALL`) a requirement? If yes, consider CSP headers or frame-ancestors.
2. Is the app deployed as `USER_ACCESSING` or `USER_DEPLOYING`? The appsscript.json says `USER_ACCESSING` which means `Session.getActiveUser().getEmail()` works correctly. If changed to `USER_DEPLOYING`, the auth system would break.
3. Should barcode field enforce a format (EAN-13, UPC-A) or remain free-text?
4. Is there a plan for data backup/export? Google Sheets has no built-in rollback beyond version history.
