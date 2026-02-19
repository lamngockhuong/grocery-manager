# Phase 3: Frontend SPA Shell & UI

## Context Links
- [Plan overview](plan.md)
- [Phase 1 - Foundation](phase-01-foundation.md)
- [Phase 2 - Product & Price CRUD](phase-02-product-price-crud.md)

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 3h
- **Depends on:** Phase 1, Phase 2
- Build SPA-like frontend: hash-based routing, Materialize CSS, product/category management pages

## Key Insights
- GAS HTML phải dùng `<script>` tags inline (no ES modules)
- google.script.run is async, cần wrapper trả về Promise
- Materialize CSS CDN cho UI nhanh, không cần build step
- Hash-based routing (#products, #categories) đơn giản nhất cho GAS
- Tất cả component HTML load qua `include()` server-side, show/hide via router

## Requirements

### Functional
- SPA shell: nav bar, sidebar/tabs, content area
- Hash-based router: #dashboard, #products, #categories, #inventory, #reports
- Product page: table with search, filter by category, add/edit modal, inline price edit
- Category page: list with add/edit/delete
- Loading states cho async operations
- Role-based UI: hide edit/delete buttons for viewers

### Non-functional
- Materialize CSS via CDN (no build step)
- Mobile responsive
- Initial data load cached in client-side state
- All google.script.run calls wrapped in Promise

## Architecture

```
index.html (shell)
  ├── <nav> Materialize sidenav
  ├── <div id="content"> (router swaps content)
  ├── <?!= include('styles.css') ?>
  ├── <?!= include('app.js') ?>
  ├── <?!= include('dashboard') ?>     [hidden by default]
  ├── <?!= include('products') ?>      [hidden by default]
  ├── <?!= include('categories') ?>    [hidden by default]
  ├── <?!= include('inventory') ?>     [hidden by default]
  └── <?!= include('reports') ?>       [hidden by default]
```

## Related Code Files

### Create
- `index.html` - Main SPA shell, nav, includes
- `app.js.html` - Router, state manager, API wrapper, utils
- `styles.css.html` - Custom styles
- `products.html` - Product list, search, modals
- `categories.html` - Category management

### Modify
- `Code.gs` - Ensure include() and doGet() work

## Implementation Steps

### 1. index.html
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <?!= include('styles.css') ?>
</head>
<body>
  <!-- Navbar -->
  <nav class="blue darken-2">
    <div class="nav-wrapper container">
      <a href="#" class="brand-logo">Quản Lý Giá</a>
      <a href="#" data-target="sidenav" class="sidenav-trigger"><i class="material-icons">menu</i></a>
      <ul class="right hide-on-med-and-down">
        <li><a href="#dashboard">Dashboard</a></li>
        <li><a href="#products">Sản phẩm</a></li>
        <li><a href="#categories">Danh mục</a></li>
        <li><a href="#inventory">Tồn kho</a></li>
        <li><a href="#reports">Báo cáo</a></li>
      </ul>
      <span id="user-info" class="right"></span>
    </div>
  </nav>

  <!-- Sidenav (mobile) -->
  <ul id="sidenav" class="sidenav">...</ul>

  <!-- Page sections - each hidden, router shows active one -->
  <div id="page-dashboard" class="page-section">
    <?!= include('dashboard') ?>
  </div>
  <div id="page-products" class="page-section">
    <?!= include('products') ?>
  </div>
  <div id="page-categories" class="page-section">
    <?!= include('categories') ?>
  </div>
  <div id="page-inventory" class="page-section">
    <?!= include('inventory') ?>
  </div>
  <div id="page-reports" class="page-section">
    <?!= include('reports') ?>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
  <?!= include('app.js') ?>
</body>
</html>
```

### 2. app.js.html
```
<script>
// === API Wrapper ===
const api = {
  call(fnName, ...args) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [fnName](...args);
    });
  }
};

// === State Manager ===
const state = {
  user: null,          // { email, role, name }
  products: [],        // [{ id, name, ..., buy_price, sell_price }]
  categories: [],      // [{ id, name, parent_id, children }]
  inventory: [],       // [{ product_id, quantity, min_stock }]
  isAdmin: false,

  async init() {
    this.user = await api.call('apiGetAuthInfo');
    this.isAdmin = this.user.role === 'admin';
    this.products = await api.call('apiGetProducts');
    this.categories = await api.call('apiGetCategories');
    // inventory lazy-loaded when tab opened
  }
};

// === Router ===
const router = {
  routes: ['dashboard', 'products', 'categories', 'inventory', 'reports'],
  current: 'dashboard',

  init() {
    window.addEventListener('hashchange', () => this.navigate());
    this.navigate();
  },

  navigate() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    if (!this.routes.includes(hash)) return;

    // Hide all, show target
    document.querySelectorAll('.page-section').forEach(el => el.style.display = 'none');
    document.getElementById('page-' + hash).style.display = 'block';

    // Update nav active state
    this.current = hash;
    this.onRouteChange(hash);
  },

  onRouteChange(page) {
    // Trigger page-specific init (lazy load data, render)
    if (page === 'products') Products.render();
    if (page === 'categories') Categories.render();
    if (page === 'inventory') Inventory.init();
    if (page === 'dashboard') Dashboard.render();
    if (page === 'reports') Reports.render();
  }
};

// === Utils ===
function showLoading(containerId) { ... }
function hideLoading(containerId) { ... }
function showToast(message, classes) { M.toast({html: message, classes}); }
function formatCurrency(num) { return num.toLocaleString('vi-VN') + 'đ'; }
function formatDate(dateStr) { return new Date(dateStr).toLocaleDateString('vi-VN'); }

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  M.AutoInit(); // Materialize init
  showLoading('content');
  try {
    await state.init();
    updateUserUI();
    updateAdminUI();
    router.init();
  } catch(e) {
    showToast('Lỗi tải dữ liệu: ' + e.message, 'red');
  }
  hideLoading('content');
});

function updateUserUI() {
  document.getElementById('user-info').textContent = state.user.name;
}

function updateAdminUI() {
  // Show/hide admin-only elements
  document.querySelectorAll('.admin-only')
    .forEach(el => el.style.display = state.isAdmin ? '' : 'none');
}
</script>
```

### 3. styles.css.html
```
<style>
  .page-section { display: none; }
  .page-section:first-of-type { display: block; }
  .loading-overlay { text-align: center; padding: 40px; }
  .admin-only { /* shown/hidden by JS */ }
  .price-cell { cursor: pointer; }
  .price-cell:hover { background: #e3f2fd; }
  .empty-state { text-align: center; padding: 60px 20px; color: #999; }
  .search-wrapper { margin-bottom: 20px; }
  /* Responsive tweaks */
  @media (max-width: 600px) {
    .hide-on-small { display: none; }
    table { font-size: 13px; }
  }
</style>
```

### 4. products.html
```
<div class="container">
  <h5>Quản Lý Sản Phẩm</h5>

  <!-- Search + Filter bar -->
  <div class="row search-wrapper">
    <div class="col s12 m6">
      <input id="product-search" type="text" placeholder="Tìm sản phẩm...">
    </div>
    <div class="col s12 m4">
      <select id="category-filter">
        <option value="">Tất cả danh mục</option>
      </select>
    </div>
    <div class="col s12 m2 admin-only">
      <button class="btn blue" onclick="Products.showAddModal()">
        <i class="material-icons left">add</i>Thêm
      </button>
    </div>
  </div>

  <!-- Products table -->
  <table class="striped responsive-table">
    <thead>
      <tr>
        <th>Tên sản phẩm</th>
        <th>Danh mục</th>
        <th>Đơn vị</th>
        <th>Giá nhập</th>
        <th>Giá bán</th>
        <th class="admin-only">Thao tác</th>
      </tr>
    </thead>
    <tbody id="products-tbody"></tbody>
  </table>

  <!-- Add/Edit Modal -->
  <div id="product-modal" class="modal">
    <div class="modal-content">
      <h5 id="product-modal-title">Thêm sản phẩm</h5>
      <form id="product-form">
        <input type="hidden" id="product-id">
        <div class="input-field"><input id="product-name" type="text" required><label>Tên</label></div>
        <div class="input-field"><select id="product-category"></select><label>Danh mục</label></div>
        <div class="input-field"><input id="product-unit" type="text"><label>Đơn vị</label></div>
        <div class="input-field"><input id="product-barcode" type="text"><label>Mã vạch</label></div>
        <div class="input-field"><input id="product-buy-price" type="number" min="0"><label>Giá nhập</label></div>
        <div class="input-field"><input id="product-sell-price" type="number" min="0"><label>Giá bán</label></div>
      </form>
    </div>
    <div class="modal-footer">
      <a class="modal-close btn-flat">Huỷ</a>
      <button class="btn blue" onclick="Products.save()">Lưu</button>
    </div>
  </div>
</div>

<script>
const Products = {
  render() {
    const tbody = document.getElementById('products-tbody');
    const products = this.getFilteredProducts();
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${this.getCategoryName(p.category_id)}</td>
        <td>${p.unit}</td>
        <td class="price-cell admin-only-inline" onclick="Products.editPrice('${p.id}', 'buy')">${formatCurrency(p.buy_price)}</td>
        <td class="price-cell admin-only-inline" onclick="Products.editPrice('${p.id}', 'sell')">${formatCurrency(p.sell_price)}</td>
        <td class="admin-only">
          <a onclick="Products.edit('${p.id}')" class="btn-small blue"><i class="material-icons">edit</i></a>
          <a onclick="Products.remove('${p.id}')" class="btn-small red"><i class="material-icons">delete</i></a>
        </td>
      </tr>
    `).join('');
    this.populateCategoryFilter();
  },

  getFilteredProducts() {
    let products = state.products.filter(p => p.status === 'active');
    const keyword = document.getElementById('product-search')?.value?.toLowerCase();
    const catId = document.getElementById('category-filter')?.value;
    if (keyword) products = products.filter(p => p.name.toLowerCase().includes(keyword));
    if (catId) products = products.filter(p => p.category_id === catId);
    return products;
  },

  getCategoryName(catId) {
    // Flatten categories tree to find name
    // ...
  },

  populateCategoryFilter() { /* populate select from state.categories */ },
  showAddModal() { /* clear form, open modal */ },
  edit(id) { /* populate form with product data, open modal */ },
  save() { /* create or update based on product-id presence */ },
  remove(id) { /* confirm + apiDeleteProduct */ },
  editPrice(id, type) { /* inline prompt hoặc small modal to update price */ }
};

// Event listeners
document.getElementById('product-search')?.addEventListener('input', () => Products.render());
document.getElementById('category-filter')?.addEventListener('change', () => Products.render());
</script>
```

### 5. categories.html
```
<div class="container">
  <h5>Quản Lý Danh Mục</h5>
  <button class="btn blue admin-only" onclick="Categories.showAddModal()">
    <i class="material-icons left">add</i>Thêm danh mục
  </button>

  <!-- Category list (grouped by parent) -->
  <ul id="categories-list" class="collection"></ul>

  <!-- Add/Edit Modal -->
  <div id="category-modal" class="modal">
    <div class="modal-content">
      <h5 id="category-modal-title">Thêm danh mục</h5>
      <form id="category-form">
        <input type="hidden" id="category-id">
        <div class="input-field"><input id="category-name" type="text" required><label>Tên</label></div>
        <div class="input-field"><select id="category-parent"><option value="">Không có (top-level)</option></select><label>Danh mục cha</label></div>
      </form>
    </div>
    <div class="modal-footer">
      <a class="modal-close btn-flat">Huỷ</a>
      <button class="btn blue" onclick="Categories.save()">Lưu</button>
    </div>
  </div>
</div>

<script>
const Categories = {
  render() {
    const list = document.getElementById('categories-list');
    list.innerHTML = state.categories.map(cat => `
      <li class="collection-item">
        <strong>${cat.name}</strong>
        ${cat.children?.length ? '<ul>' + cat.children.map(c => `<li class="collection-item">&nbsp;&nbsp;↳ ${c.name}
          <span class="secondary-content admin-only">
            <a onclick="Categories.edit('${c.id}')"><i class="material-icons">edit</i></a>
            <a onclick="Categories.remove('${c.id}')"><i class="material-icons">delete</i></a>
          </span>
        </li>`).join('') + '</ul>' : ''}
        <span class="secondary-content admin-only">
          <a onclick="Categories.edit('${cat.id}')"><i class="material-icons">edit</i></a>
          <a onclick="Categories.remove('${cat.id}')"><i class="material-icons">delete</i></a>
        </span>
      </li>
    `).join('');
  },
  showAddModal() { /* clear form, open */ },
  edit(id) { /* populate, open */ },
  save() { /* create or update */ },
  remove(id) { /* confirm + delete */ }
};
</script>
```

## Todo List
- [ ] Create index.html with nav, sidenav, page sections
- [ ] Create app.js.html with router, state manager, API wrapper
- [ ] Create styles.css.html
- [ ] Create products.html with table, search, filter, modals
- [ ] Create categories.html with tree list, modals
- [ ] Wire up search and category filter
- [ ] Implement inline price editing
- [ ] Test routing between pages
- [ ] Test product CRUD flow end-to-end
- [ ] Test category CRUD flow
- [ ] Test role-based UI (admin vs viewer)
- [ ] Test mobile responsiveness

## Success Criteria
- Navigation switches between pages without reload
- Product list renders with search + filter working
- Add/edit product modal saves to backend
- Inline price edit updates price + logs history
- Category tree displays parent-child correctly
- Viewer cannot see edit/delete buttons
- Works on mobile (nav collapses to sidenav)

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| All HTML loaded at once = large initial payload | Acceptable for <20 components, GAS caches |
| google.script.run slow (1-3s per call) | Batch initial load, show loading spinners |
| Materialize CDN down | Rare; could self-host CSS in <style> as fallback |
| XSS via product names | Escape HTML in render functions |

## Security Considerations
- Escape all user-generated content in HTML rendering
- admin-only class is cosmetic; backend enforces auth
- No sensitive data exposed in client-side state
- CSRF not applicable (GAS handles auth)

## Next Steps
- Phase 4 adds inventory.html to existing shell
- Phase 5 adds dashboard.html and reports.html
