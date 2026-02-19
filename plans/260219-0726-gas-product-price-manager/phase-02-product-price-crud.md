# Phase 2: Product & Price CRUD

## Context Links
- [Plan overview](plan.md)
- [Phase 1 - Foundation](phase-01-foundation.md)
- [Brainstorm](../reports/brainstorm-260219-0726-gas-product-price-manager.md)

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2.5h
- **Depends on:** Phase 1
- Implement ProductService, PriceService, CategoryService. Auto-log price changes to PriceHistory.

## Key Insights
- Price update phải atomic: update Prices sheet + append PriceHistory trong cùng 1 operation
- Category hỗ trợ parent-child (1 level deep đủ cho tạp hoá)
- Search products cần support Vietnamese diacritics
- Bulk price update useful cho điều chỉnh giá hàng loạt

## Requirements

### Functional
- CRUD products: create, read, update, delete, search, filter by category
- CRUD prices: update buy/sell price, auto-log to PriceHistory
- CRUD categories: create, read, update, delete, get tree (parent + children)
- Search products by name (partial match, case-insensitive)
- Filter products by category, status

### Non-functional
- All write operations require admin role
- Price update must log old values to PriceHistory
- Cache invalidation after every write
- Return consistent response format

## Architecture

```
Frontend (google.script.run)
  ├── ProductService.gs
  │     └── SheetHelper (Products sheet)
  ├── PriceService.gs
  │     ├── SheetHelper (Prices sheet)
  │     └── SheetHelper (PriceHistory sheet) [auto-log]
  └── CategoryService.gs
        └── SheetHelper (Categories sheet)
```

## Related Code Files

### Create
- `ProductService.gs` - Product CRUD + search/filter
- `PriceService.gs` - Price CRUD + history auto-logging
- `CategoryService.gs` - Category CRUD with parent-child

### Modify
- `Code.gs` - Add public wrapper functions cho google.script.run

## Implementation Steps

### 1. CategoryService.gs
```
- getCategories() -> getAll, build tree structure { id, name, parent_id, children: [] }
- getCategoryById(id) -> getById
- createCategory(data) -> requireAdmin, create({ id, name, parent_id })
- updateCategory(id, data) -> requireAdmin, update
- deleteCategory(id) -> requireAdmin, check no products using this category, delete
- getCategoryTree() -> getCategories grouped by parent
  - Top-level: parent_id empty
  - Children: parent_id = parent's id
```

### 2. ProductService.gs
```
- getProducts() -> check cache first, fallback to getAll(PRODUCTS), cache result
- getProductById(id) -> getById
- createProduct(data) -> requireAdmin, validate fields, create with generated id + created_at + status='active'
- updateProduct(id, data) -> requireAdmin, validate, update, invalidate cache
- deleteProduct(id) -> requireAdmin, set status='inactive' (soft delete), invalidate cache
- searchProducts(keyword) -> getProducts(), filter by name.toLowerCase().includes(keyword)
- filterByCategory(categoryId) -> getProducts(), filter by category_id
- getProductsWithPrices() -> join Products + Prices data by product_id
  - Cache this joined data as primary dataset
  - Return [{ ...product, buy_price, sell_price, updated_at }]
- bulkUpdateStatus(ids, status) -> requireAdmin, batch update
```

### 3. PriceService.gs
```
- getPrice(productId) -> query Prices sheet where product_id matches
- getPrices() -> getAll(PRICES), cache
- updatePrice(productId, newBuyPrice, newSellPrice) ->
  1. requireAdmin()
  2. Get current price (old values)
  3. Update Prices sheet with new values + updated_at + updated_by
  4. Append to PriceHistory: { product_id, old_buy, new_buy, old_sell, new_sell, changed_at, changed_by }
  5. Invalidate prices cache + products cache
  6. Return updated price
- createPrice(productId, buyPrice, sellPrice) ->
  - Called when creating new product
  - Create row in Prices sheet
- getPriceHistory(productId, startDate, endDate) ->
  - Query PriceHistory sheet
  - Filter by product_id and date range
  - Sort by changed_at desc
- getRecentPriceChanges(limit) ->
  - getAll PriceHistory, sort desc, take limit
```

### 4. Code.gs - Add public functions
```
// Products
function apiGetProducts() { return ProductService.getProductsWithPrices(); }
function apiCreateProduct(data) { return ProductService.createProduct(data); }
function apiUpdateProduct(id, data) { return ProductService.updateProduct(id, data); }
function apiDeleteProduct(id) { return ProductService.deleteProduct(id); }
function apiSearchProducts(keyword) { return ProductService.searchProducts(keyword); }

// Prices
function apiUpdatePrice(productId, buyPrice, sellPrice) { return PriceService.updatePrice(productId, buyPrice, sellPrice); }
function apiGetPriceHistory(productId, start, end) { return PriceService.getPriceHistory(productId, start, end); }

// Categories
function apiGetCategories() { return CategoryService.getCategoryTree(); }
function apiCreateCategory(data) { return CategoryService.createCategory(data); }
function apiUpdateCategory(id, data) { return CategoryService.updateCategory(id, data); }
function apiDeleteCategory(id) { return CategoryService.deleteCategory(id); }

// Auth
function apiGetAuthInfo() { return Auth.getAuthInfo(); }
```

## Todo List
- [ ] Create CategoryService.gs with CRUD + tree
- [ ] Create ProductService.gs with CRUD + search + filter
- [ ] Create PriceService.gs with CRUD + auto-history
- [ ] Add all api* wrapper functions to Code.gs
- [ ] Test product create/update/delete
- [ ] Test price update logs to PriceHistory
- [ ] Test search Vietnamese names
- [ ] Test category tree structure
- [ ] Test cache invalidation after writes
- [ ] Test admin role requirement on writes

## Success Criteria
- Create product -> row appears in Products + Prices sheets
- Update price -> old values logged in PriceHistory
- Search "gạo" -> returns matching products
- Delete product -> status set to 'inactive'
- Category tree returns correct parent-child structure
- Non-admin gets error on write operations

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Race condition: 2 admins update same price | Last-write-wins acceptable cho quy mô nhỏ |
| PriceHistory grows very large | Pagination, chỉ cache recent 100 entries |
| Soft delete makes getAll slow | Filter status='active' by default |

## Security Considerations
- requireAdmin() on every write operation
- Validate data types: prices must be positive numbers
- Sanitize product names (trim whitespace, prevent injection)
- updated_by always from Session, never from client

## Next Steps
- Phase 3 needs api functions ready for google.script.run calls
- Phase 5 reports depend on PriceHistory data
