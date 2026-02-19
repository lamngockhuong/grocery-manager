# Project Roadmap

## Current Status

**Version:** 1.0.0 (Released)
**Status:** Production-Ready
**Release Date:** 2024
**Maintenance:** Ongoing

All core features implemented and tested. System is stable and handling 500-2,000 SKU deployments successfully.

## Release Timeline

### Version 1.0.0 (Complete)

**Release Date:** 2024
**Status:** ✅ Production

**Features Delivered:**

- [x] Product CRUD + search + filter
- [x] Price management + atomic updates + history tracking
- [x] Category management (2-level hierarchy)
- [x] Inventory tracking + restock + low stock alerts
- [x] Dashboard with stats and warnings
- [x] Reports (low stock, price history, inventory summary)
- [x] Role-based access control (admin/viewer)
- [x] Multi-user support with permissions
- [x] Caching with chunking (>100KB support)
- [x] Atomic operations (LockService)
- [x] Setup automation (setupSheets)

**Known Limitations:**

- Linear search in getById() for large datasets
- No pagination in UI (all data loaded at once)
- No barcode scanner integration
- Single language (Vietnamese)
- No backup automation
- Manual PriceHistory sheet archival required after 5+ years

## Planned Releases

### Version 1.1.0 (Bugfixes & Performance)

**Target:** Q1/Q2 2025
**Status:** Planning

**Planned Improvements:**

- [ ] Performance: Implement ID map cache for O(1) lookups
- [ ] Performance: Add server-side filtering (reduce client-side load)
- [ ] Bugfix: Handle >2,000 products (optimize sheet reads)
- [ ] UI: Add pagination to product/inventory tables
- [ ] UI: Sort indicators on table columns
- [ ] UI: Bulk actions (select multiple, change status)
- [ ] Reports: Export to CSV/Excel format
- [ ] Reports: Print-friendly styling
- [ ] Docs: Add video tutorials
- [ ] DevOps: Pre-commit hooks for code quality

**Effort:** 40-60 hours
**Resources Needed:** 1 developer, QA tester

**Success Criteria:**

- Dashboard loads <1s with 2,000+ products
- All tables paginated (50 rows/page)
- CSV export working for all reports
- <2% regression in existing features

---

### Version 2.0.0 (Major Feature Release)

**Target:** Q3/Q4 2025
**Status:** Concept

**New Features:**

#### 1. Barcode Scanner Integration

- Integrate QuaggaJS (barcode recognition library)
- Quick product lookup via barcode
- Fast checkout/restock workflow
- Works on mobile devices
- Camera permission handling

**Scope:** 20-30 hours
**Effort Points:** 8
**Owner:** TBD

#### 2. Multi-Language Support

- Vietnamese (current)
- English (new)
- Chinese (future)
- Localization framework (i18n)
- Language preference per user
- RTL support planning

**Scope:** 15-25 hours
**Effort Points:** 5
**Owner:** TBD

#### 3. Supplier Management

- Track suppliers for each product
- Supplier contact info & pricing
- Reorder points per supplier
- Lead time tracking
- Purchase order generation (export)

**Database Changes:**

- New Suppliers sheet
- Products.supplier_id FK
- New SupplierPrices sheet

**Scope:** 30-40 hours
**Effort Points:** 12
**Owner:** TBD

#### 4. Auto-Backup & Version Control

- Daily auto-backup to Google Drive
- Version history (weekly snapshots)
- Restore from backup UI
- Data integrity checks
- Audit log for data changes

**Scope:** 20-30 hours
**Effort Points:** 8
**Owner:** TBD

**Combined Effort:** 85-125 hours (4-6 weeks, 1 developer)

**Success Criteria:**

- Barcode scanner working on iOS/Android
- Language switch functional (no page reload)
- Supplier lookup working in product creation
- Daily backup running automatically
- Restore from backup tested

---

### Version 3.0.0 (Analytics & Business Intelligence)

**Target:** 2026 (Future)
**Status:** Concept (Not Started)

**New Features:**

#### 1. Profit Margin Analysis

- Track cost vs. selling price
- Profit margin by product/category
- Identify low-margin products
- Margin trend analysis
- Alerts for negative margin

**Scope:** 25-35 hours
**Owner:** TBD

#### 2. Sales Analytics (Phase 1: Inventory Basis)

- Infer sales from inventory reduction
- Daily sales estimate
- Top selling products
- Seasonal trends
- Revenue estimation

**Note:** Requires integration with actual POS system in future

**Scope:** 20-30 hours
**Owner:** TBD

#### 3. Stock Rotation (FIFO/LIFO)

- Batch/lot tracking
- Expiration date management
- FIFO suggestion (pick oldest first)
- Waste tracking
- Shelf life alerts

**Database Changes:**

- New Batches sheet (product_id, batch_number, expiry_date, quantity)
- Inventory.batch_id FK

**Scope:** 35-45 hours
**Owner:** TBD

#### 4. Supplier Performance Reports

- On-time delivery rate
- Lead time average
- Quality issues tracking
- Cost comparison (best supplier per product)
- Supplier ratings

**Scope:** 20-30 hours
**Owner:** TBD

#### 5. Dashboard Customization

- User-selectable widgets
- Custom date ranges
- Comparison mode (month-over-month)
- Forecast/projection (simple linear)
- Alert configuration per user

**Scope:** 25-35 hours
**Owner:** TBD

**Combined Effort:** 125-175 hours (6-8 weeks, 1-2 developers)

**Success Criteria:**

- Profit margins calculated correctly
- Sales trends visible in graphs
- FIFO rotation working (test with expiries)
- Supplier performance ranked
- Dashboard customizable (widget add/remove)

---

## Future Roadmap (2026+)

### Potential Features (Concept Phase)

| Feature                  | Priority | Effort  | Owner | Status  |
| ------------------------ | -------- | ------- | ----- | ------- |
| POS Integration          | High     | 40-60h  | TBD   | Concept |
| Mobile App               | Medium   | 60-100h | TBD   | Concept |
| API (JSON/REST)          | Medium   | 30-50h  | TBD   | Concept |
| Multi-Location Support   | Medium   | 40-60h  | TBD   | Concept |
| Tax Reporting            | Medium   | 20-30h  | TBD   | Concept |
| Customer Loyalty         | Low      | 25-35h  | TBD   | Concept |
| Inventory Forecasting    | Low      | 30-50h  | TBD   | Concept |
| AWS Migration (from GAS) | Low      | 80-120h | TBD   | Concept |

## Technical Debt & Maintenance

### Known Issues

| Issue                             | Severity | Fix Effort                 | Priority |
| --------------------------------- | -------- | -------------------------- | -------- |
| Linear search in getById() O(n)   | Low      | 10h                        | v1.1     |
| No pagination in tables           | Medium   | 15h                        | v1.1     |
| PriceHistory unbounded growth     | Low      | 5h (archival script)       | v1.1     |
| No error logging beyond Logger    | Low      | 10h                        | v1.1     |
| Materialize CSS maintenance (old) | Low      | 15h (migrate to Tailwind?) | Future   |
| No unit tests                     | Medium   | 40h (add Jest)             | Future   |

### Maintenance Tasks

**Weekly:**

- [ ] Monitor Google Apps Script logs for errors
- [ ] Check for failed deployments
- [ ] Review user feedback

**Monthly:**

- [ ] Backup data (manual until v2.0 auto-backup)
- [ ] Review cache hit/miss rates
- [ ] Check for performance degradation
- [ ] Update documentation with bug fixes

**Quarterly:**

- [ ] Review roadmap progress
- [ ] Plan next release
- [ ] Security audit
- [ ] Performance analysis

**Annually:**

- [ ] Major version review
- [ ] Technology stack assessment
- [ ] Migrate PriceHistory if >1M rows
- [ ] User feedback compilation

## Success Metrics (v1.0)

### Functional Completeness

- [x] All CRUD operations working
- [x] All reports generating correctly
- [x] Atomic operations preventing race conditions
- [x] Caching working (verified via logs)
- [x] Authorization enforced server-side

### Performance Targets

- [x] Dashboard <2s on first load
- [x] Dashboard <200ms on cache hit
- [x] All operations <6min (GAS timeout)
- [x] Supports 500-2,000 products
- [x] Concurrent users: 50+ simultaneous

### Reliability

- [x] No data loss on cache miss
- [x] No duplicate products created
- [x] Price history logged for every change
- [x] Soft delete preventing orphaned data
- [x] LockService preventing race conditions

### User Satisfaction

- Target: 4.5/5 stars (no metric yet, qualitative)
- Manual testing: All workflows passed
- Store owners can manage inventory without errors

## Roadmap Metrics

### Development Velocity

**v1.0:** 2,634 LOC in ~80-100 hours (estimated)
**Average:** 26-33 LOC/hour

**Future Estimates:**

- v1.1: 40-60h (performance + UI) → +400-600 LOC
- v2.0: 85-125h (barcode + languages + suppliers + backup) → +1,000-1,500 LOC
- v3.0: 125-175h (analytics) → +1,500-2,000 LOC

### Timeline (Realistic)

```bash
2024:
  ✅ v1.0 Released (complete)

2025:
  Q1/Q2:  📋 v1.1 (bugfixes, performance)
  Q3/Q4:  📋 v2.0 (barcode, languages, suppliers, backup)

2026:
  Q1/Q2:  📋 v3.0 (analytics, profit margins, stock rotation)
  Q3+:    🔮 v4.0 (POS integration, mobile app, API)
```

## Dependency Analysis

### Version 1.1 Dependencies

- **Blocks:** None (improvements only)
- **Blocked By:** None

### Version 2.0 Dependencies

- **Blocks:** v3.0 (supplier data needed for analytics)
- **Blocked By:** v1.1 (performance baseline)

### Version 3.0 Dependencies

- **Blocks:** v4.0 (data models established)
- **Blocked By:** v2.0 (supplier data), v1.1 (performance)

### Version 4.0 Dependencies

- **Blocks:** None (next major release)
- **Blocked By:** v3.0 (analytics), v2.0 (barcode, backup)

## Resource Planning

### Current Team

**Developers:** 1 (full-time equivalent)
**QA Testers:** 0 (manual, part-time)
**Designers:** 0 (use pre-built components)
**DevOps:** 0 (Google Cloud handles everything)

### Recommended for Growth

| Phase            | Developers | QA  | Designers | Est. Time   |
| ---------------- | ---------- | --- | --------- | ----------- |
| v1.1 (bugfixes)  | 1          | 0.5 | 0         | 8-12 weeks  |
| v2.0 (features)  | 1-2        | 1   | 0.5       | 12-16 weeks |
| v3.0 (analytics) | 2          | 1   | 1         | 16-20 weeks |
| v4.0 (major)     | 3          | 2   | 1         | 20-24 weeks |

## Budget Estimates (Developer Hours)

Assuming $50-100/hour for development:

| Release | Hours | Low Budget | High Budget |
| ------- | ----- | ---------- | ----------- |
| v1.0    | 100   | $5,000     | $10,000     |
| v1.1    | 50    | $2,500     | $5,000      |
| v2.0    | 105   | $5,250     | $10,500     |
| v3.0    | 150   | $7,500     | $15,000     |
| v4.0+   | 200+  | $10,000+   | $20,000+    |

**Total (through v3.0):** 405 hours = $20,250 - $40,500

## Community & User Feedback

### v1.0 Feedback Goals

- [ ] Deploy to 5+ test stores
- [ ] Gather performance feedback
- [ ] Identify top feature requests
- [ ] Document edge cases
- [ ] Collect pain points

### Feedback Channels

- [ ] In-app feedback form (future)
- [ ] Email survey (quarterly)
- [ ] GitHub issues (if open-sourced)
- [ ] User interviews (monthly)

## Open Questions

1. **Barcode Scanner (v2.0):** Should we support both hardware scanners and mobile camera?
2. **Multi-Language (v2.0):** Which languages beyond Vietnamese and English?
3. **POS Integration (v4.0):** Which POS systems? (Misa, Viettel, custom?)
4. **Mobile App (v4.0):** Native (iOS/Android) or web-based (PWA)?
5. **Open Source:** Should we open-source this on GitHub?
6. **Monetization:** Freemium model or one-time license?

## References

- [project-overview-pdr.md](./project-overview-pdr.md) - Feature definitions
- [codebase-summary.md](./codebase-summary.md) - Current architecture
- [system-architecture.md](./system-architecture.md) - Technical deep dive
- [deployment-guide.md](./deployment-guide.md) - Setup & deployment

---

**Last Updated:** February 2025
**Maintainer:** Development Team
**Review Frequency:** Quarterly (end of Q1, Q2, Q3, Q4)
