---
title: "GAS Product Price Manager"
description: "Website quản lý giá sản phẩm tạp hoá trên Google Apps Script + Sheets"
status: complete
priority: P2
effort: "12h"
branch: main
tags: [google-apps-script, spreadsheet, spa, price-management]
created: 2026-02-19
---

# GAS Product Price Manager

Website quản lý giá sản phẩm cho tạp hoá (500-2000 SKU), full-stack trên Google Apps Script + Sheets.

## Architecture

```
Browser SPA <-> google.script.run <-> GAS Backend <-> CacheService + Sheets (6 sheets)
```

## Database (6 Sheets)

Products, Prices, Inventory, PriceHistory, Users, Categories

## GAS Files

| Backend | Frontend |
|---------|----------|
| Code.gs, Config.gs | index.html, app.js.html |
| Auth.gs, SheetHelper.gs | styles.css.html |
| CacheHelper.gs | dashboard.html |
| ProductService.gs | products.html |
| PriceService.gs, CategoryService.gs | categories.html |
| InventoryService.gs | inventory.html |
| ReportService.gs | reports.html |

## Phases

| # | Phase | File | Status | Effort |
|---|-------|------|--------|--------|
| 1 | Foundation - GAS setup, Sheets, helpers, auth | [phase-01](phase-01-foundation.md) | complete | 2h |
| 2 | Product & Price CRUD | [phase-02](phase-02-product-price-crud.md) | complete | 2.5h |
| 3 | Frontend SPA shell & UI | [phase-03](phase-03-frontend-spa.md) | complete | 3h |
| 4 | Inventory management | [phase-04](phase-04-inventory.md) | complete | 1.5h |
| 5 | Reports & Dashboard | [phase-05](phase-05-reports.md) | complete | 2h |
| 6 | Polish & error handling | [phase-06](phase-06-polish.md) | complete | 1h |

## Key Constraints

- GAS limits: 6min execution, 100 req/100s/user, CacheService 100KB/key
- Auth via `Session.getActiveUser().getEmail()` -> Users sheet lookup
- Performance: CacheService chunking + client-side state
- Roles: admin (full CRUD), viewer (read-only)

## Success Metrics

- CRUD products + prices hoạt động đúng
- Price changes auto-log history
- 3 loại báo cáo generate đúng
- Phân quyền admin/viewer hoạt động
- Load time < 3s (cached), responsive mobile

## Brainstorm

- [Brainstorm report](../reports/brainstorm-260219-0726-gas-product-price-manager.md)
