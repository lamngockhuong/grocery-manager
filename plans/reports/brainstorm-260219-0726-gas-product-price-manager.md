# Brainstorm: Website Quản Lý Giá Sản Phẩm Tạp Hoá

**Date:** 2026-02-19
**Status:** Agreed

---

## Problem Statement

Xây dựng website quản lý giá sản phẩm cho tạp hoá quy mô 500-2000 mặt hàng, sử dụng Google Apps Script (GAS) làm full-stack và Google Spreadsheet làm database. Hỗ trợ quản lý giá, tồn kho, báo cáo, phân quyền admin/viewer.

## Constraints

- **Budget:** Free (Google ecosystem)
- **Tech:** Google Apps Script + Google Sheets only
- **Users:** Chủ tiệm (admin) + nhân viên (viewer)
- **Scale:** 500-2000 sản phẩm
- **GAS limits:** 6min execution, 100 req/100s/user, CacheService 100KB/key

## Chosen Solution: All-in-one GAS Web App

### Architecture

```
┌─────────────────────────────────────────────┐
│  Browser (SPA-like)                         │
│  ┌─────────┬──────────┬──────────┬────────┐ │
│  │Dashboard│Products  │Inventory │Reports │ │
│  └────┬────┴────┬─────┴────┬─────┴───┬────┘ │
│       └─────────┴──────────┴─────────┘      │
│              google.script.run               │
└──────────────────┬──────────────────────────┘
                   │ async calls
┌──────────────────▼──────────────────────────┐
│  GAS Backend (Code.gs + modules)            │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Router   │  │ Auth/RBAC │  │ Services │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘ │
│       └──────────────┼──────────────┘       │
│              ┌───────▼────────┐             │
│              │  CacheService  │  (6h TTL)   │
│              └───────┬────────┘             │
│              ┌───────▼────────┐             │
│              │ SpreadsheetApp │             │
│              └────────────────┘             │
└─────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Google Spreadsheet (Database)              │
│  ┌──────────┐ ┌────────┐ ┌───────────────┐ │
│  │Products  │ │Prices  │ │PriceHistory   │ │
│  ├──────────┤ ├────────┤ ├───────────────┤ │
│  │Inventory │ │Users   │ │Categories     │ │
│  └──────────┘ └────────┘ └───────────────┘ │
└─────────────────────────────────────────────┘
```

### Database Design (Sheets)

**Sheet: Products**
| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID or auto-increment |
| name | string | Tên sản phẩm |
| category_id | string | FK → Categories |
| unit | string | Đơn vị (kg, cái, hộp...) |
| barcode | string | Mã vạch (optional) |
| created_at | datetime | Ngày tạo |
| status | string | active/inactive |

**Sheet: Prices**
| Column | Type | Description |
|--------|------|-------------|
| product_id | string | FK → Products |
| buy_price | number | Giá nhập |
| sell_price | number | Giá bán |
| updated_at | datetime | Lần cập nhật cuối |
| updated_by | string | Email người cập nhật |

**Sheet: Inventory**
| Column | Type | Description |
|--------|------|-------------|
| product_id | string | FK → Products |
| quantity | number | Số lượng tồn |
| min_stock | number | Mức tồn kho tối thiểu |
| last_restock | datetime | Lần nhập hàng cuối |

**Sheet: PriceHistory**
| Column | Type | Description |
|--------|------|-------------|
| product_id | string | FK → Products |
| old_buy | number | Giá nhập cũ |
| new_buy | number | Giá nhập mới |
| old_sell | number | Giá bán cũ |
| new_sell | number | Giá bán mới |
| changed_at | datetime | Thời điểm thay đổi |
| changed_by | string | Email người thay đổi |

**Sheet: Users**
| Column | Type | Description |
|--------|------|-------------|
| email | string | Google email |
| role | string | admin / viewer |
| name | string | Tên hiển thị |

**Sheet: Categories**
| Column | Type | Description |
|--------|------|-------------|
| id | string | Category ID |
| name | string | Tên danh mục |
| parent_id | string | FK self-ref (subcategory) |

### GAS Project Structure

```
├── Code.gs              # doGet(), routing, main entry
├── Auth.gs              # Authentication & RBAC
├── ProductService.gs    # CRUD products
├── PriceService.gs      # CRUD prices + history tracking
├── InventoryService.gs  # CRUD inventory
├── ReportService.gs     # Report generation
├── CacheHelper.gs       # CacheService wrapper
├── SheetHelper.gs       # Spreadsheet CRUD utilities
├── Config.gs            # Constants, sheet names, settings
├── index.html           # Main SPA shell
├── app.js.html          # Client-side routing + state management
├── styles.css.html      # CSS (Materialize/Bootstrap)
├── dashboard.html       # Dashboard component
├── products.html        # Products management component
├── inventory.html       # Inventory component
└── reports.html         # Reports component
```

### Key Features

**1. Dashboard**
- Tổng sản phẩm, tổng giá trị tồn kho
- Sản phẩm sắp hết hàng (warning)
- Thay đổi giá gần đây

**2. Quản lý sản phẩm & giá**
- CRUD sản phẩm với search/filter by category
- Cập nhật giá nhập/bán (auto log vào PriceHistory)
- Import/export từ Sheets trực tiếp
- Inline editing cho cập nhật nhanh

**3. Quản lý tồn kho**
- Cập nhật số lượng tồn
- Set mức tồn kho tối thiểu
- Cảnh báo sắp hết hàng

**4. Báo cáo**
- Sản phẩm sắp hết hàng (quantity < min_stock)
- Lịch sử thay đổi giá (filter by date range, product)
- Tổng hợp tồn kho theo danh mục (giá trị = quantity × sell_price)

**5. Phân quyền**
- Auth qua `Session.getActiveUser().getEmail()`
- Admin: full CRUD
- Viewer: chỉ xem, không sửa/xoá

### Performance Strategy

1. **Initial load:** Fetch all products + prices + inventory → cache in CacheService (chunk 100KB/key)
2. **Client memory:** Giữ data trong JS Map/Object, render từ local state
3. **Write-through:** Khi CRUD → update Sheets + invalidate cache + update local state
4. **Chunked cache:** Nếu data > 100KB, split thành chunks: `products_0`, `products_1`...
5. **Lazy load reports:** Chỉ tính khi user mở tab Reports

### Phân quyền Flow

```
User access web app
  → GAS gets email via Session.getActiveUser()
  → Lookup Users sheet
  → If not found → "Access Denied"
  → If found → return role (admin/viewer)
  → Frontend shows/hides edit buttons based on role
  → Backend double-check role on every write operation
```

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sheets slow với 2000+ rows | UX lag 1-3s | CacheService + client-side state |
| CacheService 100KB limit | Không cache hết data | Chunk data, chỉ cache hot data |
| Concurrent writes conflict | Data inconsistency | Lock mechanism via PropertiesService |
| GAS 6min timeout | Long operations fail | Batch operations, pagination |
| Google account required | Barrier for some users | Accept trade-off, tất cả đều có Google |

### Success Metrics

- [ ] CRUD products + prices hoạt động đúng
- [ ] Price changes tự động log history
- [ ] Tồn kho cập nhật real-time
- [ ] 3 loại báo cáo generate đúng
- [ ] Phân quyền admin/viewer hoạt động
- [ ] Load time < 3s cho initial load (cached)
- [ ] Hoạt động tốt trên mobile (responsive)

### Implementation Phases (Estimated)

1. **Phase 1 - Foundation:** GAS project setup, Sheets structure, SheetHelper, CacheHelper, Auth
2. **Phase 2 - Product & Price CRUD:** ProductService, PriceService, PriceHistory auto-logging
3. **Phase 3 - Frontend SPA Shell:** index.html, routing, Materialize CSS, component loading
4. **Phase 4 - Inventory:** InventoryService, inventory UI
5. **Phase 5 - Reports:** ReportService, dashboard, 3 báo cáo
6. **Phase 6 - Polish:** Error handling, mobile responsive, edge cases

### Alternatives Evaluated

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **All-in-one GAS (chosen)** | Simple, free, 1 project, native Google auth | GAS limitations, Sheets slow | Best fit cho scope |
| GAS API + GitHub Pages | Better frontend DX, no size limit | 2 deployments, CORS, auth harder | Over-engineered for this |
| Firebase + GAS | Fast DB, realtime | Learning curve, not pure Sheets | Violates requirement |

---

## Unresolved Questions

- Barcode scanner integration có cần không? (Có thể dùng camera API trên mobile)
- Có cần multi-language hay chỉ tiếng Việt?
- Backup strategy: manual export hay scheduled trigger?
