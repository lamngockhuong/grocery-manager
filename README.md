# Grocery Manager - Quan Ly Gia San Pham

Website quan ly gia san pham cho tap hoa (500-2000 SKU), full-stack tren Google Apps Script + Google Sheets.

## Features

- **Product Management**: CRUD san pham, tim kiem, loc theo danh muc
- **Price Management**: Cap nhat gia nhap/ban, tu dong ghi lich su gia
- **Category Management**: Danh muc cha-con (2 cap)
- **Inventory**: Quan ly ton kho, canh bao sap het hang, nhap hang
- **Reports**: Dashboard tong quan, bao cao sap het hang, lich su gia, tong hop ton kho
- **Auth**: Phan quyen admin/viewer theo email

## Architecture

```bash
Browser SPA <-> google.script.run <-> GAS Backend <-> CacheService + Google Sheets (6 sheets)
```

### Backend Files (`.gs`)

| File                | Description                                     |
| ------------------- | ----------------------------------------------- |
| Config.gs           | Constants, sheet names, column mappings         |
| SheetHelper.gs      | Generic CRUD utilities for Sheets               |
| CacheHelper.gs      | CacheService wrapper with chunking (>100KB)     |
| Auth.gs             | Authentication & role-based access              |
| Code.gs             | doGet(), include(), setupSheets(), API wrappers |
| ProductService.gs   | Product CRUD + search/filter                    |
| PriceService.gs     | Price CRUD + auto history logging               |
| CategoryService.gs  | Category CRUD with parent-child tree            |
| InventoryService.gs | Inventory management + low stock alerts         |
| ReportService.gs    | Dashboard stats + 3 report types                |

### Frontend Files (`.html`)

| File            | Description                               |
| --------------- | ----------------------------------------- |
| index.html      | SPA shell with nav, routing               |
| app.js.html     | Router, state manager, API wrapper, utils |
| styles.css.html | Custom styles + responsive                |
| products.html   | Product list, search, modals              |
| categories.html | Category tree, CRUD modals                |
| inventory.html  | Inventory table, restock, min stock       |
| dashboard.html  | Stats cards, low stock warnings           |
| reports.html    | 3 report tabs with filters                |

## Setup

### 1. Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Create new project
3. Copy all files from `src/` into the project

### 2. Run Setup

1. In GAS editor, run `setupSheets()` function
2. This creates 6 sheets with headers and adds you as admin

### 3. Deploy

1. Deploy > New deployment
2. Type: Web app
3. Execute as: **User accessing the web app**
4. Who has access: Choose your preference
5. Click Deploy

### Using clasp (optional)

```bash
npm install -g @google/clasp
clasp login
clasp create --type webapp --title "Grocery Manager"
clasp push
clasp deploy
```

## Database (6 Sheets)

- **Products**: id, name, category_id, unit, barcode, description, status, created_at, updated_at
- **Prices**: id, product_id, buy_price, sell_price, updated_at, updated_by
- **Inventory**: id, product_id, quantity, min_stock, last_restock, updated_at
- **PriceHistory**: id, product_id, old_buy, new_buy, old_sell, new_sell, changed_at, changed_by
- **Users**: email, name, role, created_at
- **Categories**: id, name, parent_id, created_at

## Roles

- **admin**: Full CRUD access
- **viewer**: Read-only access (no edit/delete buttons shown, server enforces)

## Constraints

- GAS execution limit: 6 minutes
- API rate: 100 requests/100s/user
- CacheService: 100KB/key (handled by chunking)
