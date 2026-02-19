/**
 * InventoryService.gs - Inventory management with low stock alerts
 */

var InventoryService = (function() {

  var CACHE_KEY = 'inventory';

  function getInventory() {
    var cached = CacheHelper.get(CACHE_KEY);
    if (cached) return cached;

    var inventory = SheetHelper.getAll(SHEETS.INVENTORY);
    var products = SheetHelper.getAll(SHEETS.PRODUCTS);

    var productMap = {};
    products.forEach(function(p) {
      if (p.status === 'active') productMap[p.id] = p.name;
    });

    var result = inventory
      .filter(function(i) { return productMap[i.product_id]; })
      .map(function(i) {
        return {
          id: i.id,
          product_id: i.product_id,
          product_name: productMap[i.product_id] || '',
          quantity: Number(i.quantity) || 0,
          min_stock: Number(i.min_stock) || 5,
          last_restock: i.last_restock || '',
          restock_note: i.restock_note || '',
          updated_at: i.updated_at || ''
        };
      });

    CacheHelper.set(CACHE_KEY, result);
    return result;
  }

  function _findInventoryRecord(productId) {
    var all = SheetHelper.getAll(SHEETS.INVENTORY);
    for (var i = 0; i < all.length; i++) {
      if (all[i].product_id === productId) return all[i];
    }
    return null;
  }

  function updateQuantity(productId, newQuantity) {
    Auth.requireAdmin();
    newQuantity = Number(newQuantity);
    if (isNaN(newQuantity) || newQuantity < 0) throw new Error('Số lượng phải >= 0');

    var record = _findInventoryRecord(productId);
    if (!record) throw new Error('Không tìm thấy tồn kho cho sản phẩm');

    SheetHelper.update(SHEETS.INVENTORY, record.id, {
      quantity: newQuantity,
      updated_at: new Date().toISOString()
    });
    CacheHelper.remove(CACHE_KEY);
    return { success: true };
  }

  function restock(productId, addQuantity, note) {
    Auth.requireAdmin();
    addQuantity = Number(addQuantity);
    if (isNaN(addQuantity) || addQuantity <= 0) throw new Error('Số lượng nhập thêm phải > 0');

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var record = _findInventoryRecord(productId);
      if (!record) throw new Error('Không tìm thấy tồn kho cho sản phẩm');

      var currentQty = Number(record.quantity) || 0;
      var updateData = {
        quantity: currentQty + addQuantity,
        last_restock: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (note !== undefined && note !== null) {
        updateData.restock_note = String(note).substring(0, 200);
      }
      SheetHelper.update(SHEETS.INVENTORY, record.id, updateData);
      CacheHelper.remove(CACHE_KEY);
      return { success: true, new_quantity: currentQty + addQuantity };
    } finally {
      lock.releaseLock();
    }
  }

  function setMinStock(productId, minStock) {
    Auth.requireAdmin();
    minStock = Number(minStock);
    if (isNaN(minStock) || minStock < 0) throw new Error('Mức tối thiểu phải >= 0');

    var record = _findInventoryRecord(productId);
    if (!record) throw new Error('Không tìm thấy tồn kho cho sản phẩm');

    SheetHelper.update(SHEETS.INVENTORY, record.id, {
      min_stock: minStock,
      updated_at: new Date().toISOString()
    });
    CacheHelper.remove(CACHE_KEY);
    return { success: true };
  }

  function getLowStockProducts() {
    var inventory = getInventory();
    return inventory
      .filter(function(i) { return i.quantity < i.min_stock; })
      .sort(function(a, b) { return (a.min_stock - a.quantity) - (b.min_stock - b.quantity); })
      .reverse();
  }

  function createInventoryForProduct(productId) {
    SheetHelper.create(SHEETS.INVENTORY, {
      product_id: productId,
      quantity: 0,
      min_stock: 5,
      last_restock: '',
      updated_at: new Date().toISOString()
    });
    CacheHelper.remove(CACHE_KEY);
  }

  return {
    getInventory: getInventory,
    updateQuantity: updateQuantity,
    restock: restock,
    setMinStock: setMinStock,
    getLowStockProducts: getLowStockProducts,
    createInventoryForProduct: createInventoryForProduct
  };

})();
