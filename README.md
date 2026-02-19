# Grocery Manager - Quản Lý Giá Sản Phẩm

Website quản lý giá sản phẩm cho tạp hoá (500-2000 SKU), full-stack trên Google Apps Script + Google Sheets.

## Features

- **Product Management**: CRUD sản phẩm, tìm kiếm (theo tên/barcode/mô tả), lọc theo danh mục, xem chi tiết modal
- **Product Images**: Upload/hiển thị ảnh sản phẩm qua Google Drive
- **Barcode Scanner**: Quét barcode bằng camera thiết bị
- **Google Price Search**: Tìm giá sản phẩm trên Google từ modal chi tiết
- **Price Management**: Cập nhật giá nhập/bán, tự động ghi lịch sử giá (bỏ qua nếu giá không đổi)
- **Category Management**: Danh mục cha-con (2 cấp)
- **Inventory**: Quản lý tồn kho, cảnh báo sắp hết hàng, nhập hàng với ghi chú
- **Reports**: Dashboard tổng quan, báo cáo sắp hết hàng, lịch sử giá, tổng hợp tồn kho
- **Table Features**: Sắp xếp cột, phân trang
- **Auth**: Phân quyền admin/viewer theo email
- **Configurable**: Tên app thay đổi qua Script Properties (`APP_NAME`)

## Architecture

```bash
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

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm push`        | Push code to GAS                     |
| `pnpm push:watch`  | Auto-push on file changes            |
| `pnpm run deploy`  | Push + create timestamped deployment |
| `pnpm open`        | Open GAS editor in browser           |
| `pnpm open:webapp` | Open deployed web app                |
| `pnpm logs`        | View execution logs                  |
| `pnpm status`      | Check file sync status               |

## Database (6 Sheets)

- **Products**: id, name, category_id, unit, barcode, description, image_id, status, created_at, updated_at
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
