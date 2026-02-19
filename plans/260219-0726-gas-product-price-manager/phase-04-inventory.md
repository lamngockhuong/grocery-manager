# Phase 4: Inventory Management

## Context Links
- [Plan overview](plan.md)
- [Phase 2 - Product & Price CRUD](phase-02-product-price-crud.md)
- [Phase 3 - Frontend SPA](phase-03-frontend-spa.md)

## Overview
- **Priority:** P2
- **Status:** complete
- **Effort:** 1.5h
- **Depends on:** Phase 1, 2, 3
- InventoryService backend + inventory.html UI. Low stock alerts, restock tracking.

## Key Insights
- Inventory sheet: 1 row per product (1:1 with Products)
- min_stock mặc định = 5 nếu không set
- Low stock = quantity < min_stock -> highlight đỏ
- Restock = cộng thêm quantity, update last_restock

## Requirements

### Functional
- View inventory list (product name, quantity, min_stock, last_restock)
- Update quantity (set absolute or add/subtract)
- Set min_stock threshold per product
- Restock: add quantity + update last_restock timestamp
- Low stock warning: highlight rows where quantity < min_stock
- Auto-create inventory row when new product created

### Non-functional
- Inventory data lazy-loaded (only fetch when tab opened)
- Cache inventory data after first load
- Admin-only for updates

## Architecture

```
inventory.html
  └── google.script.run
        └── InventoryService.gs
              └── SheetHelper (Inventory sheet)
```

## Related Code Files

### Create
- `InventoryService.gs` - Inventory CRUD + low stock logic
- `inventory.html` - Inventory table UI

### Modify
- `Code.gs` - Add api* wrapper functions
- `ProductService.gs` - Auto-create inventory row on product create
- `app.js.html` - Add Inventory.init() lazy loading

## Implementation Steps

### 1. InventoryService.gs
```
- getInventory() ->
  - Check cache('inventory')
  - getAll(INVENTORY)
  - Join with Products to get product name
  - Return [{ product_id, product_name, quantity, min_stock, last_restock }]

- updateQuantity(productId, newQuantity) ->
  - requireAdmin()
  - Validate newQuantity >= 0
  - update(INVENTORY, productId, { quantity: newQuantity })
  - Invalidate cache

- restock(productId, addQuantity) ->
  - requireAdmin()
  - Get current quantity
  - Update: quantity += addQuantity, last_restock = new Date()
  - Invalidate cache

- setMinStock(productId, minStock) ->
  - requireAdmin()
  - Validate minStock >= 0
  - update(INVENTORY, productId, { min_stock: minStock })
  - Invalidate cache

- getLowStockProducts() ->
  - getInventory()
  - Filter where quantity < min_stock
  - Sort by (min_stock - quantity) desc (most urgent first)

- createInventoryForProduct(productId) ->
  - Called from ProductService.createProduct
  - create(INVENTORY, { product_id: productId, quantity: 0, min_stock: 5, last_restock: '' })
```

### 2. Code.gs - Add wrappers
```
function apiGetInventory() { return InventoryService.getInventory(); }
function apiUpdateQuantity(productId, qty) { return InventoryService.updateQuantity(productId, qty); }
function apiRestock(productId, addQty) { return InventoryService.restock(productId, addQty); }
function apiSetMinStock(productId, min) { return InventoryService.setMinStock(productId, min); }
function apiGetLowStock() { return InventoryService.getLowStockProducts(); }
```

### 3. inventory.html
```
<div class="container">
  <h5>Quản Lý Tồn Kho</h5>

  <!-- Summary cards -->
  <div class="row">
    <div class="col s6 m3"><div class="card-panel"><span id="inv-total">0</span><br>Tổng mặt hàng</div></div>
    <div class="col s6 m3"><div class="card-panel red lighten-4"><span id="inv-low">0</span><br>Sắp hết hàng</div></div>
  </div>

  <!-- Filter: show low stock only -->
  <label>
    <input type="checkbox" id="low-stock-filter" onchange="Inventory.render()">
    <span>Chỉ hiện sắp hết hàng</span>
  </label>

  <!-- Inventory table -->
  <table class="striped responsive-table">
    <thead>
      <tr>
        <th>Sản phẩm</th>
        <th>Tồn kho</th>
        <th>Tối thiểu</th>
        <th>Nhập hàng cuối</th>
        <th class="admin-only">Thao tác</th>
      </tr>
    </thead>
    <tbody id="inventory-tbody"></tbody>
  </table>

  <!-- Restock Modal -->
  <div id="restock-modal" class="modal">
    <div class="modal-content">
      <h5>Nhập thêm hàng</h5>
      <input type="hidden" id="restock-product-id">
      <p id="restock-product-name"></p>
      <div class="input-field">
        <input id="restock-quantity" type="number" min="1">
        <label>Số lượng nhập thêm</label>
      </div>
    </div>
    <div class="modal-footer">
      <a class="modal-close btn-flat">Huỷ</a>
      <button class="btn blue" onclick="Inventory.doRestock()">Nhập hàng</button>
    </div>
  </div>

  <!-- Min Stock Modal -->
  <div id="minstock-modal" class="modal">
    <div class="modal-content">
      <h5>Đặt mức tối thiểu</h5>
      <input type="hidden" id="minstock-product-id">
      <p id="minstock-product-name"></p>
      <div class="input-field">
        <input id="minstock-value" type="number" min="0">
        <label>Mức tồn kho tối thiểu</label>
      </div>
    </div>
    <div class="modal-footer">
      <a class="modal-close btn-flat">Huỷ</a>
      <button class="btn blue" onclick="Inventory.saveMinStock()">Lưu</button>
    </div>
  </div>
</div>

<script>
const Inventory = {
  loaded: false,

  async init() {
    if (!this.loaded) {
      showLoading('inventory-tbody');
      state.inventory = await api.call('apiGetInventory');
      this.loaded = true;
    }
    this.render();
  },

  render() {
    let items = state.inventory;
    if (document.getElementById('low-stock-filter')?.checked) {
      items = items.filter(i => i.quantity < i.min_stock);
    }

    document.getElementById('inv-total').textContent = state.inventory.length;
    document.getElementById('inv-low').textContent =
      state.inventory.filter(i => i.quantity < i.min_stock).length;

    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = items.map(i => {
      const isLow = i.quantity < i.min_stock;
      return `<tr class="${isLow ? 'red lighten-5' : ''}">
        <td>${i.product_name}</td>
        <td>${i.quantity} ${isLow ? '<i class="material-icons tiny red-text">warning</i>' : ''}</td>
        <td>${i.min_stock}</td>
        <td>${i.last_restock ? formatDate(i.last_restock) : '-'}</td>
        <td class="admin-only">
          <a onclick="Inventory.showRestock('${i.product_id}')" class="btn-small blue">Nhập hàng</a>
          <a onclick="Inventory.showMinStock('${i.product_id}')" class="btn-small grey">Đặt min</a>
        </td>
      </tr>`;
    }).join('');
  },

  showRestock(productId) { /* populate modal, open */ },
  doRestock() { /* api call, update state, re-render */ },
  showMinStock(productId) { /* populate modal, open */ },
  saveMinStock() { /* api call, update state, re-render */ }
};
</script>
```

### 4. ProductService.gs modification
```
In createProduct(), after creating product row, call:
InventoryService.createInventoryForProduct(newProductId);
```

## Todo List
- [ ] Create InventoryService.gs
- [ ] Add inventory api wrappers to Code.gs
- [ ] Create inventory.html
- [ ] Modify ProductService to auto-create inventory row
- [ ] Wire Inventory.init() in app.js router
- [ ] Test restock flow
- [ ] Test min_stock setting
- [ ] Test low stock filter
- [ ] Test new product gets inventory row

## Success Criteria
- Inventory table shows all products with quantities
- Low stock rows highlighted red with warning icon
- Restock adds quantity + updates last_restock
- Min stock threshold saved and used for alerts
- New product auto-gets inventory row (qty=0, min=5)
- Low stock filter toggles correctly

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Inventory row missing for old products | Add migration: scan Products, create missing inventory rows |
| Negative quantity after manual edit | Validate >= 0 on both client + server |

## Security Considerations
- All write operations require admin
- Validate numeric inputs server-side
- Don't allow negative quantities

## Next Steps
- Phase 5 uses getLowStockProducts() for dashboard + reports
