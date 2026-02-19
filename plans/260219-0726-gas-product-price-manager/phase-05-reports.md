# Phase 5: Reports & Dashboard

## Context Links
- [Plan overview](plan.md)
- [Phase 2 - Product & Price CRUD](phase-02-product-price-crud.md)
- [Phase 4 - Inventory](phase-04-inventory.md)

## Overview
- **Priority:** P2
- **Status:** complete
- **Effort:** 2h
- **Depends on:** Phase 1, 2, 3, 4
- ReportService backend + dashboard.html + reports.html. 3 reports: low stock, price history, inventory summary.

## Key Insights
- Dashboard = quick overview, reports = detailed data with filters
- Reports lazy-loaded (computed on demand, not cached)
- Inventory summary groups by category, calculates total value
- Price history can grow large -> pagination or date range filter required

## Requirements

### Functional
- **Dashboard:** total products, total inventory value, low stock count, recent price changes (5)
- **Report 1 - Low Stock:** products where quantity < min_stock, sortable
- **Report 2 - Price History:** filter by product, date range; show old/new prices
- **Report 3 - Inventory Summary:** group by category, total quantity, total value (qty * sell_price)

### Non-functional
- Reports computed on-demand (not pre-cached)
- Dashboard stats cached briefly (5 min)
- Tables sortable by clicking headers (client-side)

## Architecture

```
dashboard.html ──┐
reports.html ────┤
                 └── google.script.run
                       └── ReportService.gs
                             ├── ProductService
                             ├── PriceService
                             └── InventoryService
```

## Related Code Files

### Create
- `ReportService.gs` - Report generation logic
- `dashboard.html` - Dashboard stats + widgets
- `reports.html` - 3 report tabs with filters

### Modify
- `Code.gs` - Add api* wrapper functions

## Implementation Steps

### 1. ReportService.gs
```
- getDashboardStats() ->
  products = getProducts() (cached)
  inventory = getInventory() (cached)
  prices = getPrices() (cached)
  lowStock = inventory.filter(i => i.quantity < i.min_stock)
  recentChanges = getRecentPriceChanges(5)
  totalValue = inventory.reduce((sum, i) => {
    price = prices.find(p => p.product_id === i.product_id)
    return sum + (i.quantity * (price?.sell_price || 0))
  }, 0)
  return {
    totalProducts: products.length,
    totalValue,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock.slice(0, 5),
    recentChanges
  }

- getLowStockReport() ->
  inventory = getInventory()
  Join with Products for names
  Filter quantity < min_stock
  Sort by deficit (min_stock - quantity) desc
  Return [{ product_name, category, quantity, min_stock, deficit }]

- getPriceHistoryReport(productId, startDate, endDate) ->
  history = getAll(PRICE_HISTORY)
  Filter by productId if provided
  Filter by date range if provided
  Join with Products for product name
  Sort by changed_at desc
  Return [{ product_name, old_buy, new_buy, old_sell, new_sell, changed_at, changed_by }]

- getInventorySummaryReport() ->
  inventory = getInventory()
  products = getProducts()
  prices = getPrices()
  categories = getCategories()
  Group products by category
  For each category:
    totalQuantity = sum of quantities
    totalValue = sum of (quantity * sell_price)
    productCount = count
  Return [{ category_name, product_count, total_quantity, total_value }]
```

### 2. Code.gs - Add wrappers
```
function apiGetDashboardStats() { return ReportService.getDashboardStats(); }
function apiGetLowStockReport() { return ReportService.getLowStockReport(); }
function apiGetPriceHistoryReport(productId, start, end) { return ReportService.getPriceHistoryReport(productId, start, end); }
function apiGetInventorySummaryReport() { return ReportService.getInventorySummaryReport(); }
```

### 3. dashboard.html
```
<div class="container">
  <h5>Dashboard</h5>

  <!-- Stats cards -->
  <div class="row">
    <div class="col s6 m3">
      <div class="card-panel blue white-text center-align">
        <h4 id="stat-total-products">-</h4>
        <p>Sản phẩm</p>
      </div>
    </div>
    <div class="col s6 m3">
      <div class="card-panel green white-text center-align">
        <h4 id="stat-total-value">-</h4>
        <p>Giá trị tồn kho</p>
      </div>
    </div>
    <div class="col s6 m3">
      <div class="card-panel orange white-text center-align">
        <h4 id="stat-low-stock">-</h4>
        <p>Sắp hết hàng</p>
      </div>
    </div>
  </div>

  <!-- Low stock warning list -->
  <div class="card" id="low-stock-card" style="display:none">
    <div class="card-content">
      <span class="card-title red-text">Cảnh báo sắp hết hàng</span>
      <ul id="low-stock-list" class="collection"></ul>
    </div>
  </div>

  <!-- Recent price changes -->
  <div class="card">
    <div class="card-content">
      <span class="card-title">Thay đổi giá gần đây</span>
      <table class="striped">
        <thead>
          <tr><th>Sản phẩm</th><th>Giá nhập</th><th>Giá bán</th><th>Thời gian</th></tr>
        </thead>
        <tbody id="recent-changes-tbody"></tbody>
      </table>
    </div>
  </div>
</div>

<script>
const Dashboard = {
  async render() {
    showLoading('stat-total-products');
    try {
      const stats = await api.call('apiGetDashboardStats');
      document.getElementById('stat-total-products').textContent = stats.totalProducts;
      document.getElementById('stat-total-value').textContent = formatCurrency(stats.totalValue);
      document.getElementById('stat-low-stock').textContent = stats.lowStockCount;

      // Low stock warnings
      if (stats.lowStockCount > 0) {
        document.getElementById('low-stock-card').style.display = 'block';
        document.getElementById('low-stock-list').innerHTML = stats.lowStockProducts
          .map(p => `<li class="collection-item">${p.product_name}: còn ${p.quantity}/${p.min_stock}</li>`)
          .join('');
      }

      // Recent changes
      document.getElementById('recent-changes-tbody').innerHTML = stats.recentChanges
        .map(c => `<tr>
          <td>${c.product_name || c.product_id}</td>
          <td>${formatCurrency(c.old_buy)} → ${formatCurrency(c.new_buy)}</td>
          <td>${formatCurrency(c.old_sell)} → ${formatCurrency(c.new_sell)}</td>
          <td>${formatDate(c.changed_at)}</td>
        </tr>`).join('');
    } catch(e) {
      showToast('Lỗi tải dashboard: ' + e.message, 'red');
    }
  }
};
</script>
```

### 4. reports.html
```
<div class="container">
  <h5>Báo Cáo</h5>

  <!-- Tab navigation -->
  <ul class="tabs">
    <li class="tab"><a href="#report-low-stock" class="active">Sắp hết hàng</a></li>
    <li class="tab"><a href="#report-price-history">Lịch sử giá</a></li>
    <li class="tab"><a href="#report-inventory-summary">Tổng hợp tồn kho</a></li>
  </ul>

  <!-- Tab 1: Low Stock -->
  <div id="report-low-stock">
    <table class="striped">
      <thead>
        <tr><th>Sản phẩm</th><th>Danh mục</th><th>Tồn kho</th><th>Tối thiểu</th><th>Thiếu</th></tr>
      </thead>
      <tbody id="report-low-stock-tbody"></tbody>
    </table>
  </div>

  <!-- Tab 2: Price History -->
  <div id="report-price-history">
    <div class="row">
      <div class="col s12 m4">
        <select id="ph-product-filter"><option value="">Tất cả sản phẩm</option></select>
      </div>
      <div class="col s6 m3">
        <input type="date" id="ph-start-date" class="datepicker">
        <label>Từ ngày</label>
      </div>
      <div class="col s6 m3">
        <input type="date" id="ph-end-date" class="datepicker">
        <label>Đến ngày</label>
      </div>
      <div class="col s12 m2">
        <button class="btn blue" onclick="Reports.loadPriceHistory()">Xem</button>
      </div>
    </div>
    <table class="striped">
      <thead>
        <tr><th>Sản phẩm</th><th>Giá nhập cũ→mới</th><th>Giá bán cũ→mới</th><th>Ngày</th><th>Người sửa</th></tr>
      </thead>
      <tbody id="report-ph-tbody"></tbody>
    </table>
  </div>

  <!-- Tab 3: Inventory Summary -->
  <div id="report-inventory-summary">
    <table class="striped">
      <thead>
        <tr><th>Danh mục</th><th>Số mặt hàng</th><th>Tổng tồn kho</th><th>Tổng giá trị</th></tr>
      </thead>
      <tbody id="report-inv-summary-tbody"></tbody>
    </table>
  </div>
</div>

<script>
const Reports = {
  async render() {
    M.Tabs.init(document.querySelector('.tabs'));
    this.loadLowStock();
    this.populateProductFilter();
  },

  async loadLowStock() {
    const data = await api.call('apiGetLowStockReport');
    document.getElementById('report-low-stock-tbody').innerHTML = data
      .map(r => `<tr class="red lighten-5">
        <td>${r.product_name}</td><td>${r.category}</td>
        <td>${r.quantity}</td><td>${r.min_stock}</td><td>${r.deficit}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="center">Không có sản phẩm sắp hết</td></tr>';
  },

  async loadPriceHistory() {
    const productId = document.getElementById('ph-product-filter').value;
    const start = document.getElementById('ph-start-date').value;
    const end = document.getElementById('ph-end-date').value;
    const data = await api.call('apiGetPriceHistoryReport', productId, start, end);
    document.getElementById('report-ph-tbody').innerHTML = data
      .map(r => `<tr>
        <td>${r.product_name}</td>
        <td>${formatCurrency(r.old_buy)} → ${formatCurrency(r.new_buy)}</td>
        <td>${formatCurrency(r.old_sell)} → ${formatCurrency(r.new_sell)}</td>
        <td>${formatDate(r.changed_at)}</td>
        <td>${r.changed_by}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="center">Không có dữ liệu</td></tr>';
  },

  async loadInventorySummary() {
    const data = await api.call('apiGetInventorySummaryReport');
    document.getElementById('report-inv-summary-tbody').innerHTML = data
      .map(r => `<tr>
        <td>${r.category_name}</td><td>${r.product_count}</td>
        <td>${r.total_quantity}</td><td>${formatCurrency(r.total_value)}</td>
      </tr>`).join('');
  },

  populateProductFilter() {
    const select = document.getElementById('ph-product-filter');
    state.products.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
    M.FormSelect.init(select);
  }
};
</script>
```

## Todo List
- [ ] Create ReportService.gs with all 4 report functions
- [ ] Add report api wrappers to Code.gs
- [ ] Create dashboard.html with stats cards + widgets
- [ ] Create reports.html with 3 tabs
- [ ] Wire Dashboard.render() and Reports.render() in router
- [ ] Test dashboard stats accuracy
- [ ] Test low stock report
- [ ] Test price history with filters
- [ ] Test inventory summary by category
- [ ] Test empty state displays

## Success Criteria
- Dashboard shows correct totals, low stock warnings, recent changes
- Low stock report lists all products below threshold
- Price history filters by product + date range
- Inventory summary groups by category with correct totals
- Empty states show "no data" messages

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Reports slow with large PriceHistory | Date range filter required, limit results |
| Dashboard stats stale | Re-fetch on each tab visit, no aggressive caching |

## Security Considerations
- Reports read-only, no special auth needed beyond basic access check
- No sensitive data in reports (just prices and quantities)

## Next Steps
- Phase 6 polishes all pages including reports
