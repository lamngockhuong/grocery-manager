# Project Changelog

All notable changes to the Grocery Manager project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

## [1.0.2] - 2026-02-23

### Added

- **About Modal & Footer** - Improved app discoverability and transparency
  - About modal accessible from sidenav (mobile) and footer (desktop/mobile)
  - Modal displays author info: name, email, GitHub repo, version, license (ISC)
  - Page footer with dynamic copyright year, clickable author name (modal trigger), app version, GitHub repo link
  - Footer CSS with responsive design (desktop + mobile optimized)
  - Dynamic copyright year via JavaScript (auto-updates annually)
  - GitHub repo link in footer points to `lamngockhuong/grocery-manager`
  - Author: Lâm Ngọc Khương <me@ngockhuong.com>

### Other

- **Added ISC LICENSE file** at project root (Copyright 2026 Lam Ngoc Khuong)
- Improves project discoverability via GitHub (public repository link in-app)

## [1.0.1] - 2026-02-21

### Added

- **iCheck Barcode Lookup Integration** - Admins can now lookup product information from iCheck API by barcode when adding/editing products
  - New service: `ICheckService.gs` (107 LOC) - Handles iCheck API authentication and product lookup
  - New API endpoint: `apiLookupBarcode(barcode)` - Admin-only endpoint for barcode lookup
  - Frontend enhancement: "Tìm trên iCheck" button in product form (Vietnamese: "Search on iCheck")
  - Preview modal showing product name, price, and image from iCheck
  - Auto-fill functionality: "Điền vào form" button populates product form fields from iCheck data
  - Barcode validation: 8-14 digit format validation
  - Error handling: Gracefully returns null for invalid barcodes or API failures
  - ESLint config: Added `ICheckService: 'writable'` to globals

### Technical Details

- ICheckService uses iCheck's public API endpoints:
  - Anonymous authentication (no API key required, cached 5 minutes)
  - Barcode search: `/social/api/products/search`
  - Product detail: `/social/api/products/code/{code}`
- Caching optimization: Anonymous token cached via `CacheService` (5min TTL) reduces HTTP roundtrips from 3 to 2 for repeated lookups
- Products.html updated with iCheck lookup UI components
- Atomic with existing barcode scanner - both methods coexist
- Admin-only access enforced via `Auth.requireAdmin()`

## [1.0.0] - 2026-02-19

### Added

Initial production release with core features:

- Product management (CRUD, search, filter by category)
- Product images (upload, camera capture, URL paste, compression via Google Drive)
- Barcode scanner with camera-based scanning (BarcodeDetector API via `barcode-detector@3` polyfill)
- Google price search from product detail modal
- Price management with atomic updates and auto-history logging
- Category management (2-level parent-child hierarchy)
- Inventory tracking, restock with notes, low stock alerts
- Dashboard with statistics and low stock warnings
- Reports (low stock, price history, inventory summary)
- Table sorting and pagination (25 items/page)
- Role-based access control (admin/viewer)
- Multi-user support with email-based permissions
- Caching with chunking (supports >100KB datasets)
- Atomic operations via LockService (prevents race conditions)
- Setup automation (setupSheets creates all database tables)
- Configurable app name via Script Properties
- Server-side embedded initial data (eliminates first-load RPCs)
- Mobile responsive design
- Code formatting and linting (dprint + ESLint)
- Bilingual documentation (English + Vietnamese)
- Public GitHub repository

### Architecture

- **Backend:** Google Apps Script (GAS v8) + Google Sheets (6-sheet database)
- **Frontend:** Vanilla JS + HTML5 SPA (no build step)
- **Database:** 6 sheets (Products, Prices, Inventory, PriceHistory, Categories, Users)
- **Auth:** Google OAuth via Session.getActiveUser()
- **Caching:** 10-minute TTL with chunking for large datasets
- **Locking:** LockService for atomic price/inventory updates

### Known Limitations (v1.0)

- Linear search in SheetHelper.getById() - O(n) performance
- No unit test framework (GAS limitation)
- PriceHistory unbounded growth (recommend archival after 5 years)
- Limited error logging (relies on GAS Logger)
- 6-minute execution timeout (GAS limit)
- 100 requests/100s rate limit per user (GAS limit)

---

## Version History

| Version | Release Date | Status     | Key Feature                                    |
| ------- | ------------ | ---------- | ---------------------------------------------- |
| 1.0.2   | 2026-02-23   | Released   | About modal, footer, author info, ISC license  |
| 1.0.1   | 2026-02-21   | Released   | iCheck barcode lookup integration              |
| 1.0.0   | 2026-02-19   | Production | Initial release with core inventory management |

---

## Planned Releases

### Version 2.0.0 (Q3/Q4 2026)

- Performance optimization (ID map cache, handle >2K products)
- UI enhancements (bulk actions, CSV/Excel export)
- Multi-language support (i18n framework)
- Supplier management (supplier tracking, reorder points)
- Auto-backup & version control

### Version 3.0.0 (Q1/Q2 2027)

- Profit margin analysis
- Sales analytics (infer from inventory reduction)
- Stock rotation (FIFO/LIFO with expiration dates)
- Supplier performance reports
- Dashboard customization

### Version 4.0.0 (2027+)

- POS integration
- Mobile app (native or PWA)
- REST API
- Multi-location support
- Tax reporting

---

**Last Updated:** 2026-02-23
**Maintainer:** Development Team
**Format:** [Keep a Changelog](https://keepachangelog.com/)
