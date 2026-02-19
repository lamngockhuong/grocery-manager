# Code Standards & Conventions

## Overview

This document establishes coding standards for the Grocery Manager project. All contributors must follow these conventions to maintain consistency and quality.

## Language Considerations

### Google Apps Script (GAS) Specifics

**V8 Runtime Only:**

- No CommonJS modules or ES imports
- Use IIFE (Immediately Invoked Function Expression) for encapsulation
- No `const`/`let` - use `var` (legacy support)
- Arrow functions supported but callbacks may be inconsistent

**Global Variables:**

- Intentional: `SPREADSHEET_ID`, `APP_NAME`, `SHEETS`, `COLUMNS`, `CACHE_TTL`, `ROLES`, `ID_PREFIXES`
- Must be UPPERCASE with underscores
- Documented in Config.gs

**Built-in APIs:**

- `SpreadsheetApp`, `HtmlService`, `CacheService`, `LockService`, `Session`, `Utilities`
- Not `require()`-able, always available globally
- See Google documentation for latest API changes

## File Organization

### Backend Files (.gs)

**Naming Convention:** PascalCase with .gs extension

```bash
Config.gs
Auth.gs
ProductService.gs
```

**File Size Limit:** Keep under 200 LOC per file

- Exception: ProductService (177 LOC), PriceService (128 LOC), ReportService (118 LOC) acceptable for feature-complete modules
- If approaching 200 LOC, split into smaller services

**File Structure Template:**

```javascript
/**
 * ModuleName.gs - Purpose description
 */

var ModuleName = (function() {
  // Private helper functions
  function _privateHelper() { ... }

  // Public methods
  function publicMethod() { ... }

  // Exported API
  return {
    publicMethod: publicMethod,
    anotherMethod: anotherMethod
  };
})();
```

### Frontend Files (.html)

**Naming Convention:** kebab-case with .html extension (or descriptive PascalCase for clarity)

```bash
index.html (SPA shell)
app.js.html (JavaScript)
styles.css.html (CSS)
products.html (Product page)
dashboard.html (Dashboard page)
```

**File Size Limit:** Keep under 200 LOC

- Products/Inventory/Reports pages near limit; consider splitting complex pages

**File Structure Template:**

```html
<!-- Page title as comment -->
<!-- Purpose: ... -->

<div id="page-id" class="page-container">
  <!-- HTML content -->
</div>

<!-- JavaScript for this page -->
<script>
  // Page-specific logic
  app.pages.productPage = {
    init: function() { ... }
  };
</script>
```

## Naming Conventions

### Variables & Functions

**Backend:**

- Global constants: `UPPERCASE_WITH_UNDERSCORES`
- Function names: `camelCase`
- Private functions: `_camelCase()` (leading underscore)
- Local variables: `camelCase`

**Frontend:**

- Variables: `camelCase`
- Functions: `camelCase`
- HTML IDs: `kebab-case` (e.g., `#product-form`, `#inventory-table`)
- CSS classes: `kebab-case` (e.g., `.btn-primary`, `.modal-overlay`)

### Service Methods

**Getter Methods:**

```javascript
getProducts(); // Get all (plural)
getProductById(id); // Get single (by identifier)
getProductsWithPrices(); // Get with join
```

**Setter/Creator Methods:**

```javascript
createProduct(data);
updateProduct(id, data);
deleteProduct(id); // Physical deletion (rare)
```

**Utility Methods:**

```javascript
searchProducts(keyword);
filterByCategory(id);
```

### Data Properties

Use camelCase for JavaScript object properties, but snake_case for Google Sheets column names:

**In Sheets (snake_case):**

```bash
id, product_id, buy_price, sell_price, created_at, updated_at
```

**In JavaScript objects (camelCase preferred, but match sheet names):**

```javascript
{
  id: '...',
  productId: '...',           // OR product_id (match sheets)
  buyPrice: 100,              // OR buy_price
  sellPrice: 200,
  createdAt: '2024-01-01'     // OR created_at
}
```

**IMPORTANT:** Keep Google Sheets column names in snake_case (clearer in sheets), match them in SheetHelper.\_rowToObject() mapping.

## API Response Format

**Standard Response Object:**

```javascript
{
  success: true,              // boolean
  data: { ... }               // Any type, only if success=true
  error: undefined
}
```

**Error Response:**

```javascript
{
  success: false,
  data: undefined,
  error: "Human-readable error message"
}
```

**All API wrappers in Code.gs must follow this format.**

## Error Handling

### Backend Errors

**Always use try-catch in API wrappers:**

```javascript
function apiGetProducts() {
  try {
    Auth.checkAccess(); // First line: check permissions
    var result = ProductService.getProducts();
    return { success: true, data: result };
  } catch (e) {
    Logger.log("apiGetProducts error: " + e.message);
    return { success: false, error: e.message };
  }
}
```

**Error Messages:** Use descriptive, actionable messages

```javascript
throw new Error("Product name cannot be empty"); // Good
throw new Error("Invalid input"); // Bad (too vague)
throw new Error("Tên sản phẩm không được để trống"); // Good (Vietnamese)
```

**Vietnamese Error Messages:** Consider target audience (Vietnamese store owners)

```javascript
"Tên sản phẩm không được để trống";
"Danh mục không tồn tại";
"Bạn không có quyền thực hiện thao tác này";
```

### Frontend Error Handling

**Show user-friendly messages:**

```javascript
api.call("apiGetProducts", []).then(function (result) {
  if (result.success) {
    app.state.products = result.data;
    renderProductTable();
  } else {
    M.toast({ html: "Lỗi: " + result.error });
    Logger.log("Error: " + result.error);
  }
});
```

## Data Validation

### Backend Validation

**Validate all inputs before processing:**

```javascript
function createProduct(data) {
  // Type checking
  if (typeof data !== "object") throw new Error("Invalid data");

  // Required fields
  if (!data.name || !data.name.trim())
    throw new Error("Tên không được để trống");
  if (!data.unit || !data.unit.trim())
    throw new Error("Đơn vị không được để trống");

  // Range checking
  var price = Number(data.buy_price);
  if (isNaN(price) || price < 0) throw new Error("Giá phải >= 0");

  // Business logic
  if (data.category_id) {
    var cat = CategoryService.getCategoryById(data.category_id);
    if (!cat) throw new Error("Danh mục không tồn tại");
  }

  // Uniqueness
  var existing = SheetHelper.query(SHEETS.PRODUCTS, function (p) {
    return p.name.toLowerCase() === data.name.trim().toLowerCase();
  });
  if (existing.length > 0) throw new Error("Sản phẩm đã tồn tại");
}
```

### Frontend Validation

**Use Materialize form validation:**

```javascript
<form id="product-form">
  <input type="text" name="name" required class="validate">
  <input type="text" name="unit" required class="validate">
  <input type="number" name="buy_price" min="0" required>
  <input type="number" name="sell_price" min="0" required>
</form>

<script>
function validateForm(formSelector) {
  var form = document.querySelector(formSelector);
  return form.checkValidity();
}
</script>
```

## Authorization & Authentication

### Backend Auth Pattern

**Every API must start with Auth.checkAccess():**

```javascript
function apiCreateProduct(data) {
  try {
    Auth.checkAccess(); // Verify user exists in Users sheet
    Auth.requireAdmin(); // Verify user is admin (for admin-only endpoints)
    // ... operation
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

**Role-Based Checks:**

```javascript
// Check if user is admin
if (Auth.isAdmin(Auth.getCurrentUser())) {
  // show admin UI
}

// Require admin privilege
Auth.requireAdmin(); // throws if not admin

// Get current user info
var user = Auth.getAuthInfo(); // {email, role, name}
```

### Frontend Auth Pattern

**Load user info on page load:**

```javascript
document.addEventListener("DOMContentLoaded", function () {
  api.call("apiGetAuthInfo", []).then(function (result) {
    if (result.success) {
      app.state.currentUser = result.data;
      renderNavBar(); // Show user name/role
      renderUIBasedOnRole(); // Show/hide buttons
    }
  });
});
```

**Conditional Button Rendering:**

```javascript
if (app.state.currentUser.role === "admin") {
  document.getElementById("add-product-btn").style.display = "block";
} else {
  document.getElementById("add-product-btn").style.display = "none";
}
```

## Performance Guidelines

### Caching

**Cache read-heavy data:**

```javascript
var cached = CacheHelper.get("products");
if (cached) return cached;

var data = SheetHelper.getAll(SHEETS.PRODUCTS);
CacheHelper.set("products", data, CACHE_TTL);
return data;
```

**Invalidate on write:**

```javascript
SheetHelper.create(SHEETS.PRODUCTS, data);
CacheHelper.remove("products"); // Invalidate
CacheHelper.remove("products_with_prices");
```

**Cache TTL:** 10 minutes (CACHE_TTL = 600)

### Atomic Operations

**Use LockService for concurrent updates:**

```javascript
function updatePrice(productId, buyPrice, sellPrice) {
  LockService.lock();
  try {
    var existing = SheetHelper.getById(SHEETS.PRICES, productId);

    SheetHelper.update(SHEETS.PRICES, productId, {
      buy_price: buyPrice,
      sell_price: sellPrice,
      updated_at: new Date().toISOString(),
      updated_by: Auth.getCurrentUser(),
    });

    SheetHelper.create(SHEETS.PRICE_HISTORY, {
      product_id: productId,
      old_buy: existing.buy_price,
      new_buy: buyPrice,
      old_sell: existing.sell_price,
      new_sell: sellPrice,
      changed_at: new Date().toISOString(),
      changed_by: Auth.getCurrentUser(),
    });
  } finally {
    LockService.releaseLock();
  }
}
```

### Batch Operations

**Use batch methods when possible:**

```javascript
function bulkUpdateStatus(ids, status) {
  ids.forEach(function (id) {
    SheetHelper.update(SHEETS.PRODUCTS, id, {
      status: status,
      updated_at: new Date().toISOString(),
    });
  });
  CacheHelper.remove("products");
}
```

## Logging

### Backend Logging

**Use Logger for debugging (visible in GAS editor logs):**

```javascript
Logger.log("Processing product: " + productId);
Logger.log("Cache hit for: " + CACHE_KEY);
Logger.log("SheetHelper.getAll error: " + e.message); // In catch blocks
```

**Log format:** `ModuleName.functionName: message`

### Frontend Logging

**Use console.log for browser debugging:**

```javascript
console.log("Product loaded:", app.state.products);
console.log("API error:", result.error);
```

## Comments & Documentation

### Backend Comments

**File Header:**

```javascript
/**
 * ProductService.gs - Product CRUD with search, filter, cache
 */
```

**Function Comments:**

```javascript
/**
 * Search products by keyword (case-insensitive)
 * @param {string} keyword - Search term
 * @return {Array} Filtered products array
 */
function searchProducts(keyword) { ... }
```

**Complex Logic:**

```javascript
// Soft delete: set status to inactive instead of removing row
// Preserves referential integrity with price history
SheetHelper.update(SHEETS.PRODUCTS, id, { status: "inactive" });
```

### Frontend Comments

**Page Initialization:**

```javascript
app.pages.productPage = {
  init: function () {
    // Load products from server
    this.loadProducts();
    // Bind form submit
    this.attachEventListeners();
  },
};
```

**Complex UI Logic:**

```javascript
// Build parent-child tree: O(n²) but acceptable for <1000 categories
// Reconstruct on every load (cache friendly)
function buildCategoryTree(categories) { ... }
```

## Testing Approach

### Manual Testing Checklist

**Product CRUD:**

- [ ] Create product → verify price & inventory auto-created
- [ ] Update product name/unit → verify cache invalidated
- [ ] Delete product → verify soft delete (status='inactive')
- [ ] Search by keyword → verify case-insensitive match

**Price Management:**

- [ ] Update price → verify locked (no race conditions)
- [ ] Update price → verify history logged with timestamp & email
- [ ] Get price history → verify date range filter works

**Authorization:**

- [ ] Viewer can see all pages but no edit buttons
- [ ] Admin sees edit/delete buttons
- [ ] Non-authorized user (not in Users sheet) gets error
- [ ] Admin-only endpoints reject viewer requests

**Performance:**

- [ ] Dashboard loads < 2s on first load
- [ ] Dashboard loads < 200ms on refresh (cache hit)
- [ ] 2000 products load within 6-min timeout

### No Unit Testing in v1

GAS doesn't support Jest/Mocha easily. Future phases should:

1. Migrate to Apps Script with TypeScript/Clasp
2. Add Jest or similar testing framework
3. Write unit tests for service layer
4. Write integration tests for API wrappers

## Security Guidelines

### Data Protection

**Never expose sensitive data in client code:**

```javascript
// BAD: API key in frontend
var API_KEY = "sk-12345..."; // Never!

// GOOD: Use server-side API wrappers only
function apiGetProtectedData() {
  // API key is in backend only
  return ProtectedService.getData();
}
```

**XSS Prevention:**

```javascript
// BAD: Direct HTML injection
document.getElementById("product-name").innerHTML = product.name;

// GOOD: Use escapeHtml() or textContent
function escapeHtml(text) {
  var map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, function (s) {
    return map[s];
  });
}

document.getElementById("product-name").textContent = product.name;
// OR
document.getElementById("product-name").innerHTML = escapeHtml(product.name);
```

### Authorization Enforcement

**Server-side authorization only:**

```javascript
// BAD: Client-side auth check only
if (isAdmin) {
  submitForm();
} // Can be bypassed in DevTools!

// GOOD: Always verify on server
function apiCreateProduct(data) {
  Auth.requireAdmin(); // Server-side check, cannot be bypassed
  // ... create product
}
```

## Git & Version Control

### Commit Message Format

**Conventional Commit:**

```bash
type(scope): description

[optional body]
[optional footer]
```

**Types:** feat, fix, docs, style, refactor, perf, test, chore

**Examples:**

```bash
feat(products): add bulk update status
fix(cache): handle >100KB data chunking
docs(api): update price history endpoint
refactor(auth): consolidate permission checks
perf(reports): cache dashboard stats
```

### Don't Commit

- `.env` files with sensitive data
- `repomix-output.xml` (generated)
- GAS script ID secrets
- Spreadsheet IDs (should be in Config.gs only)

## Future Improvements

**Code Quality:**

1. Migrate to TypeScript + Clasp
2. Add ESLint for JavaScript
3. Implement unit testing framework
4. Add pre-commit hooks for linting

**Performance:**

1. Implement `getByIdMap()` for O(1) lookups
2. Add pagination to large reports
3. Implement server-side filtering
4. Use batch sheet operations (batchGet/batchUpdate)

**Architecture:**

1. Split ProductService into smaller modules
2. Create separate Repository layer for data access
3. Add service layer for business logic
4. Implement decorator pattern for caching
