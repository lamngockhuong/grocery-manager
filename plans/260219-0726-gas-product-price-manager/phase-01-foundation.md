# Phase 1: Foundation

## Context Links
- [Plan overview](plan.md)
- [Brainstorm](../reports/brainstorm-260219-0726-gas-product-price-manager.md)

## Overview
- **Priority:** P1 (blocking all other phases)
- **Status:** complete
- **Effort:** 2h
- Setup GAS project, tạo 6 sheets với headers, helper modules, auth system

## Key Insights
- SheetHelper phải generic để tái sử dụng cho mọi sheet
- CacheService limit 100KB/key -> cần chunking strategy
- Auth check phải ở cả frontend (UI) lẫn backend (mỗi write operation)
- `Session.getActiveUser()` chỉ hoạt động khi deploy "Execute as: User accessing the web app"

## Requirements

### Functional
- Config file chứa spreadsheet ID, sheet names, constants
- Generic CRUD helper cho Sheets operations
- CacheService wrapper hỗ trợ chunking >100KB
- Auth system: check email against Users sheet, return role
- Setup script tạo 6 sheets với đúng headers

### Non-functional
- SheetHelper methods phải return consistent format `{ success, data, error }`
- Cache TTL mặc định 6 giờ
- All sheet operations phải try-catch

## Architecture

```
Code.gs (doGet + include helper)
  ├── Config.gs (constants)
  ├── SheetHelper.gs (generic CRUD)
  ├── CacheHelper.gs (chunked cache)
  └── Auth.gs (getActiveUser, checkRole, requireAdmin)
```

## Related Code Files

### Create
- `Config.gs` - Spreadsheet ID, sheet names, column mappings, constants
- `SheetHelper.gs` - Generic sheet CRUD utilities
- `CacheHelper.gs` - CacheService wrapper with chunking
- `Auth.gs` - Authentication & role-based access
- `Code.gs` - doGet(), include() helper, global error handler

## Implementation Steps

### 1. Config.gs
```
- SPREADSHEET_ID constant (set after creating spreadsheet)
- SHEETS object: { PRODUCTS: 'Products', PRICES: 'Prices', INVENTORY: 'Inventory', PRICE_HISTORY: 'PriceHistory', USERS: 'Users', CATEGORIES: 'Categories' }
- COLUMNS object: mapping cho mỗi sheet (array of header names)
- CACHE_TTL: 21600 (6h in seconds)
- ROLES: { ADMIN: 'admin', VIEWER: 'viewer' }
```

### 2. SheetHelper.gs
```
Tất cả functions nhận sheetName param.
- getSheet(sheetName) -> returns sheet object
- getAll(sheetName) -> return all rows as array of objects (header-mapped)
- getById(sheetName, id) -> find row where col A = id
- create(sheetName, data) -> append row, generate ID (timestamp-based)
- update(sheetName, id, data) -> find row by id, update cells
- delete(sheetName, id) -> remove row
- query(sheetName, filterFn) -> getAll then filter
- generateId() -> 'P' + Date.now() or similar prefix-based
- _rowToObject(headers, row) -> convert array to object
- _objectToRow(headers, obj) -> convert object to array
```

### 3. CacheHelper.gs
```
- CHUNK_SIZE: 90000 (bytes, safe under 100KB)
- get(key) -> check chunk count key, reassemble chunks
- set(key, data, ttl) -> JSON.stringify, split if >CHUNK_SIZE, store chunks + count key
- remove(key) -> remove all chunks + count key
- invalidate(prefix) -> remove keys matching prefix pattern
- _getChunkKeys(key, count) -> generate chunk key names
```

### 4. Auth.gs
```
- getCurrentUser() -> Session.getActiveUser().getEmail()
- getUserRole(email) -> lookup Users sheet, return role or null
- isAdmin(email) -> getUserRole() === 'admin'
- requireAdmin() -> throw error if not admin
- getAuthInfo() -> return { email, role, name } for frontend
- checkAccess() -> if no user found in Users sheet, throw AccessDenied
```

### 5. Code.gs
```
- doGet(e) -> return HtmlService.createTemplateFromFile('index').evaluate()
  .setTitle('Quản Lý Giá Sản Phẩm')
  .addMetaTag('viewport', 'width=device-width, initial-scale=1')
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
- include(filename) -> HtmlService.createHtmlOutputFromFile(filename).getContent()
- setupSheets() -> create all 6 sheets with headers if not exist
- Expose public functions cho google.script.run (wrapper functions)
```

### 6. Setup Script
```
- setupSheets() function:
  - Get or create spreadsheet
  - For each sheet in SHEETS:
    - Check if sheet exists, create if not
    - Set headers from COLUMNS config
    - Format header row (bold, freeze)
  - Add sample admin user to Users sheet
  - Log setup complete
```

## Todo List
- [ ] Create Config.gs with all constants
- [ ] Create SheetHelper.gs with generic CRUD
- [ ] Create CacheHelper.gs with chunking
- [ ] Create Auth.gs with role checking
- [ ] Create Code.gs with doGet and include
- [ ] Create setupSheets() function
- [ ] Test setup script creates all sheets correctly
- [ ] Test SheetHelper CRUD operations
- [ ] Test CacheHelper chunking with large data
- [ ] Test Auth returns correct roles

## Success Criteria
- Chạy setupSheets() tạo đúng 6 sheets với headers
- SheetHelper.getAll/create/update/delete hoạt động
- CacheHelper set/get data >100KB không lỗi
- Auth.getAuthInfo() trả về đúng role cho user trong Users sheet
- Code.gs doGet() render được trang HTML trống

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Session.getActiveUser() trả empty khi deploy sai mode | Document deploy settings: "Execute as: User accessing" |
| Sheet column order thay đổi -> data mapping sai | Dùng header-based mapping, không hardcode column index |
| CacheService quota exceeded | Implement graceful fallback: if cache fails, read from sheet |

## Security Considerations
- Không store sensitive data trong CacheService (nó shared)
- Auth check trên mỗi write operation, không chỉ frontend
- Validate SPREADSHEET_ID exists trước khi operations

## Next Steps
- Phase 2 depends on SheetHelper + Config being complete
- Phase 3 depends on Code.gs doGet() + Auth.getAuthInfo()
