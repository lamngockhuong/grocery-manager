# Phase 6: Polish & Error Handling

## Context Links
- [Plan overview](plan.md)
- All previous phases

## Overview
- **Priority:** P3
- **Status:** complete
- **Effort:** 1h
- **Depends on:** Phase 1-5
- Global error handling, responsive fixes, loading/empty states, input validation, final testing.

## Key Insights
- GAS errors don't propagate nicely -> wrap all api functions in try-catch
- Mobile users common for tạp hoá (chủ tiệm dùng điện thoại)
- Empty states important for first-time setup (no products yet)
- Input validation must be both client + server side

## Requirements

### Functional
- Global error handler wraps all api* functions
- User-friendly Vietnamese error messages
- Loading spinners on every async operation
- Empty state messages when no data
- Client-side input validation with error highlighting
- Server-side validation (duplicate check, type check, range check)

### Non-functional
- All tables responsive on mobile (horizontal scroll or card layout)
- Touch-friendly buttons (min 44px tap target)
- Toast notifications for success/error
- No console errors in normal flow

## Related Code Files

### Modify
- `Code.gs` - Wrap all api* functions in try-catch
- `app.js.html` - Add global error handler, improve loading states
- `styles.css.html` - Mobile responsive fixes
- `products.html` - Form validation, empty state
- `categories.html` - Form validation, empty state
- `inventory.html` - Form validation, empty state
- `reports.html` - Empty state, loading
- `dashboard.html` - Loading state
- `SheetHelper.gs` - Add validation helpers
- All Service files - Add input validation

## Implementation Steps

### 1. Server-side error handling (Code.gs)
```
// Wrap pattern for all api* functions:
function apiGetProducts() {
  try {
    Auth.checkAccess();
    return { success: true, data: ProductService.getProductsWithPrices() };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// Apply to ALL api* functions
// Standardize response: { success: boolean, data?: any, error?: string }
```

### 2. Server-side validation (Services)
```
// ProductService.createProduct validation:
- name: required, non-empty, trim, max 200 chars
- category_id: must exist in Categories sheet
- unit: required
- buy_price: number >= 0
- sell_price: number >= 0, >= buy_price (warning if not)
- Duplicate check: no existing active product with same name

// PriceService.updatePrice validation:
- prices: numbers >= 0
- productId: must exist

// InventoryService validation:
- quantity: integer >= 0
- min_stock: integer >= 0

// CategoryService validation:
- name: required, non-empty, unique
- parent_id: must exist if provided
- Cannot delete category with products
```

### 3. Client-side validation (app.js.html)
```
// Add validate utility:
function validateForm(rules) {
  let valid = true;
  rules.forEach(({ field, message, check }) => {
    const el = document.getElementById(field);
    if (!check(el.value)) {
      el.classList.add('invalid');
      el.nextElementSibling?.setAttribute('data-error', message);
      valid = false;
    } else {
      el.classList.remove('invalid');
    }
  });
  return valid;
}

// Product form rules:
[
  { field: 'product-name', message: 'Tên không được để trống', check: v => v.trim().length > 0 },
  { field: 'product-buy-price', message: 'Giá nhập phải >= 0', check: v => !isNaN(v) && Number(v) >= 0 },
  { field: 'product-sell-price', message: 'Giá bán phải >= 0', check: v => !isNaN(v) && Number(v) >= 0 },
]
```

### 4. API wrapper update (app.js.html)
```
// Update api.call to handle standardized response:
const api = {
  async call(fnName, ...args) {
    const result = await new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [fnName](...args);
    });
    if (result && result.success === false) {
      throw new Error(result.error || 'Có lỗi xảy ra');
    }
    return result?.data ?? result;
  }
};
```

### 5. Loading & Empty states
```
// Loading: show spinner in container
function showLoading(containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = '<div class="loading-overlay"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div></div></div></div>';
}

// Empty state: show message when no data
function showEmptyState(containerId, message) {
  document.getElementById(containerId).innerHTML =
    `<tr><td colspan="10" class="empty-state"><i class="material-icons large">inbox</i><p>${message}</p></td></tr>`;
}

// Apply in each render function:
if (products.length === 0) showEmptyState('products-tbody', 'Chưa có sản phẩm nào');
```

### 6. Mobile responsive fixes (styles.css.html)
```
/* Cards stack vertically on mobile */
@media (max-width: 600px) {
  .card-panel h4 { font-size: 1.5rem; }
  table { font-size: 12px; }
  .btn, .btn-small { padding: 0 12px; }
  .modal { width: 95%; max-height: 90%; }
  .container { width: 95%; }
  /* Table horizontal scroll */
  .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  /* Touch-friendly */
  .btn, .btn-small, a.btn-small { min-height: 44px; min-width: 44px; }
}
```

### 7. Final testing checklist
```
Functional:
- [ ] Create product -> appears in list + inventory row created
- [ ] Edit product -> data updated
- [ ] Delete product -> soft deleted, disappears from list
- [ ] Update price -> PriceHistory logged
- [ ] Search products -> correct results
- [ ] Filter by category -> correct results
- [ ] Restock -> quantity updated, last_restock set
- [ ] Set min_stock -> low stock alert triggers correctly
- [ ] Dashboard stats -> accurate numbers
- [ ] 3 reports -> correct data

Validation:
- [ ] Empty product name -> error message
- [ ] Negative price -> rejected
- [ ] Delete category with products -> rejected
- [ ] Non-admin tries to edit -> rejected

UI/UX:
- [ ] Loading spinner on every data fetch
- [ ] Empty state on empty tables
- [ ] Toast notifications for success/error
- [ ] Mobile nav works
- [ ] Tables scrollable on mobile
- [ ] Modals fit on small screens
- [ ] Vietnamese text displays correctly

Security:
- [ ] Viewer cannot access CRUD operations
- [ ] Unknown email gets "Access Denied"
- [ ] Server validates all inputs
```

## Todo List
- [ ] Add try-catch wrappers to all api* functions in Code.gs
- [ ] Add validation to all Service create/update functions
- [ ] Add client-side form validation
- [ ] Update api wrapper to handle standardized response
- [ ] Add loading spinners to all pages
- [ ] Add empty state messages
- [ ] Fix mobile responsive issues
- [ ] Run through final testing checklist
- [ ] Fix any issues found in testing

## Success Criteria
- No unhandled errors in normal usage
- All forms validate before submit
- Server rejects invalid data with clear messages
- Mobile layout usable on 375px width
- Loading states visible during async ops
- Empty states display when no data
- All items in testing checklist pass

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| try-catch hides real bugs | Log errors to console + return to user |
| Over-validation annoys users | Keep validation reasonable, focus on data integrity |

## Security Considerations
- Server-side validation is the real gate, client-side is UX only
- Sanitize all string inputs (trim, max length)
- Never trust client-provided email/role

## Next Steps
- Deploy as web app: "Execute as: User accessing the web app", "Who has access: Anyone within domain" or specific users
- Create README with deploy instructions
- Consider future: barcode scanner, multi-language, auto-backup trigger
