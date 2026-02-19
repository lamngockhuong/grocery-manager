# Grocery Manager - Product Overview & Requirements

## Project Summary

**Grocery Manager** (Quản Lý Giá Sản Phẩm) is a web-based inventory and price management system designed for small grocery stores (tạp hóa) in Vietnam. The application helps store owners manage 500-2,000 SKUs with real-time pricing, inventory tracking, and comprehensive reporting.

## Problem Statement

Small grocery store owners face challenges in:

- Managing product prices across multiple suppliers
- Tracking inventory levels and preventing stockouts
- Maintaining price history for cost analysis
- Generating reports on low stock items and price trends
- Controlling who can modify critical data (multi-user access)

## Target Users

Primary: Grocery store owners and managers (tạp hóa owners)
Secondary: Store staff (clerks, inventory managers)
Tertiary: Store accountants/business analysts

## Technology Stack

**Backend:**

- Google Apps Script (GAS) v8 runtime
- Google Sheets (6-sheet relational model)
- Google CacheService (10-minute TTL, chunked up to 1MB)
- LockService for atomic operations

**Frontend:**

- HTML5 SPA (Single Page Application)
- Vanilla JavaScript (no npm/build step)
- Materialize CSS 1.x (responsive UI)
- Hash-based routing (#/products, #/inventory, etc.)

**Deployment:**

- Google Apps Script Web App
- No external hosting required
- Scales to hundreds of concurrent users

## Core Features

### 1. Product Management

- CRUD operations on products (name, unit, category, barcode, description, image_url)
- Search products by keyword or barcode
- Filter by category
- Soft delete with status tracking (active/inactive)
- Automatic creation of related price & inventory records
- Product images with upload, camera capture, URL paste
- Client-side compression (max 800px, JPEG 0.7 quality)

### 2. Price Management

- Track buy price (cost) and sell price (retail)
- Atomic price updates with LockService
- Auto-log all price changes in PriceHistory sheet
- Price history reports with date range filtering
- Track who changed prices and when

### 3. Category Management

- Parent-child category hierarchy (2 levels)
- CRUD operations
- Validates no products before deletion
- Tree view in UI

### 4. Inventory Management

- Track quantity per product
- Set minimum stock thresholds
- Restock tracking with timestamps
- Low stock alerts (real-time)
- Inventory value reports by category
- Atomic restock operations

### 5. Dashboard & Reports

- Summary stats: total products, inventory value, low stock count
- Low stock report with alerts
- Price history trends per product
- Inventory summary by category
- All reports cacheable for fast loading

### 6. Product Image Management

- Upload product images to Google Drive
- Support multiple input methods: file upload, camera capture, URL paste
- Client-side compression to reduce file size
- Image preview in product list and detail modals
- Admin-only image upload/delete operations
- Automatic cleanup of old images when replaced

### 7. Role-Based Access Control

- **Admin**: Full CRUD on all entities, image upload/delete
- **Viewer**: Read-only access (no edit/delete buttons, no image upload)
- Server-side enforcement via Auth.checkAccess()
- User management via Users sheet

## Non-Functional Requirements

### Performance

- CacheService: All queries cached (10-min TTL)
- Chunked caching for >100KB datasets
- Dashboard loads in <2 seconds
- Reports load in <3 seconds

### Reliability

- 6-minute execution timeout per request
- 100 requests/100 seconds per user (GAS rate limit)
- No data loss on cache misses (reads from sheets)
- Atomic price updates via LockService

### Scalability

- Supports 500-2,000 products
- Handles 100+ concurrent users
- Unlimited price history retention
- No external database cost

### Security

- Google OAuth via Session.getActiveUser()
- Role-based access control (admin/viewer)
- Server-side authorization checks on all APIs
- No sensitive data in client-side code

## Database Schema

| Sheet        | Purpose                           | Records    |
| ------------ | --------------------------------- | ---------- |
| Products     | Master product list               | ~500-2,000 |
| Prices       | Current buy/sell prices           | ~500-2,000 |
| Inventory    | Stock levels & thresholds         | ~500-2,000 |
| PriceHistory | Audit trail of all price changes  | Unbounded  |
| Categories   | Product categories (2-level tree) | ~50-100    |
| Users        | Access control & permissions      | ~5-20      |

## Product Development Requirements (PDRs)

### Functional PDRs

| ID  | Feature                      | Status   | Sprint |
| --- | ---------------------------- | -------- | ------ |
| F01 | Product CRUD + search        | Complete | v1     |
| F02 | Price management + history   | Complete | v1     |
| F03 | Category hierarchy           | Complete | v1     |
| F04 | Inventory tracking + restock | Complete | v1     |
| F05 | Dashboard & stats            | Complete | v1     |
| F06 | Low stock alerts             | Complete | v1     |
| F07 | Price history reports        | Complete | v1     |
| F08 | Inventory summary reports    | Complete | v1     |
| F09 | Role-based access            | Complete | v1     |
| F10 | Multi-user access            | Complete | v1     |

### Non-Functional PDRs

| ID   | Requirement                | Status   | Notes                     |
| ---- | -------------------------- | -------- | ------------------------- |
| NF01 | <2s dashboard load         | Complete | Cache-enabled             |
| NF02 | Support 500-2,000 products | Complete | Tested to 2K SKUs         |
| NF03 | Atomic price updates       | Complete | LockService-based         |
| NF04 | 10-minute data cache       | Complete | CacheHelper with chunking |
| NF05 | Unlimited price history    | Complete | Unbounded sheet           |
| NF06 | Server-side auth checks    | Complete | All APIs protected        |

## Success Metrics (v1)

- [ ] Product data accurate & in sync with physical inventory
- [ ] Price changes tracked 100% (no missed updates)
- [ ] Low stock alerts triggered within 30 seconds
- [ ] No concurrent update conflicts
- [ ] All user permissions enforced server-side
- [ ] Dashboard & reports load within target times
- [ ] Supports 2,000+ products without slowdown

## Future Roadmap

### Phase 2 (Future)

- Barcode scanner integration (mobile-friendly)
- Supplier management & auto-reorder
- Multi-language support (Vietnamese/English)
- Auto-backup to Google Drive
- Receipt/POS integration

### Phase 3 (Future)

- Profit margin tracking
- Sales analytics
- Stock rotation (FIFO/LIFO)
- Batch expiration tracking
- Supplier performance reports

## Constraints

**GAS Limits:**

- 6-minute execution timeout per request
- 100 requests/100 seconds per user
- CacheService 100KB per key (handled via chunking)

**Browser Limits:**

- No offline support (requires internet)
- No ES modules or build step
- Materialize CSS CDN-only

**Data Limits:**

- Google Sheets: 10 million cells max (~2,000 products sustainable)
- PriceHistory unbounded (new sheet recommended after 5+ years)

## Development Status

**Current Version:** v1.0.0 (Complete)

- 19 files total (10 .gs, 8 .html, 1 appsscript.json)
- 2,634 LOC in src/
- All core features implemented and tested
- Production-ready

**Maintenance:** Ongoing (bugfixes, performance tuning)

## Getting Started

See [deployment-guide.md](./deployment-guide.md) for setup instructions.

For developers: See [codebase-summary.md](./codebase-summary.md) and [code-standards.md](./code-standards.md).

For architects: See [system-architecture.md](./system-architecture.md).
