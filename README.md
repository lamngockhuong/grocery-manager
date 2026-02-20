# Grocery Manager

[Tiếng Việt](README.vi.md)

Grocery store price management web app (500-2000 SKU), built entirely on Google Apps Script + Google Sheets.

## Screenshots

|                  Dashboard                   |                  Products                  |
| :------------------------------------------: | :----------------------------------------: |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Products](docs/screenshots/products.png) |

|                     Product Detail                     |                    Product Form                    |
| :----------------------------------------------------: | :------------------------------------------------: |
| ![Product Detail](docs/screenshots/product-detail.png) | ![Product Form](docs/screenshots/product-form.png) |

|                   Categories                   |                  Inventory                   |
| :--------------------------------------------: | :------------------------------------------: |
| ![Categories](docs/screenshots/categories.png) | ![Inventory](docs/screenshots/inventory.png) |

|                 Reports                  |                     Barcode Scanner                      |
| :--------------------------------------: | :------------------------------------------------------: |
| ![Reports](docs/screenshots/reports.png) | ![Barcode Scanner](docs/screenshots/barcode-scanner.png) |

## Features

- **Product Management**: CRUD products, search (by name/barcode/description), filter by category, detail modal
- **Product Images**: Upload/display product images via Google Drive
- **Barcode Scanner**: Scan barcodes using device camera
- **Google Price Search**: Search product prices on Google from detail modal
- **Price Management**: Update buy/sell prices, auto-log price history (skip if unchanged)
- **Category Management**: Parent-child categories (2 levels)
- **Inventory**: Stock management, low stock alerts, restock with notes
- **Reports**: Overview dashboard, low stock report, price history, inventory summary
- **Table Features**: Column sorting, pagination
- **Auth**: Role-based access control (admin/viewer) by email
- **Configurable**: App name via Script Properties (`APP_NAME`)

## Architecture

```
Browser SPA <-> google.script.run <-> GAS Backend <-> CacheService + Google Sheets (6 sheets)
                                                   └-> Google Drive (product images)
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
| ImageService.gs     | Product image upload/serve via Google Drive     |
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

### Prerequisites

- Node.js 14+
- pnpm

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Login & Create GAS Project

```bash
pnpm exec clasp login
pnpm exec clasp create --title "Grocery Manager" --type standalone --rootDir src
```

### 3. Run Setup

1. `pnpm open` to open GAS editor
2. Run `setupSheets()` function — creates 6 sheets with headers + adds you as admin

### 4. Deploy

```bash
pnpm run deploy    # push code + create new deployment
```

### Available Scripts

| Script              | Description                                 |
| ------------------- | ------------------------------------------- |
| `pnpm push`         | Push code to GAS                            |
| `pnpm push:watch`   | Auto-push on file changes                   |
| `pnpm run deploy`   | Push + create timestamped deployment        |
| `pnpm open`         | Open GAS editor in browser                  |
| `pnpm open:webapp`  | Open deployed web app                       |
| `pnpm logs`         | View execution logs                         |
| `pnpm status`       | Check file sync status                      |
| `pnpm format`       | Format code with dprint                     |
| `pnpm format:check` | Check formatting (no changes)               |
| `pnpm lint`         | Lint `.gs` files with ESLint                |
| `pnpm lint:fix`     | Auto-fix lint issues                        |
| `pnpm check`        | Format check + lint (use before committing) |

## Database (6 Sheets)

- **Products**: id, name, category_id, unit, barcode, description, image_url, status, created_at, updated_at
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
