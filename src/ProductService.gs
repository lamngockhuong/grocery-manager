/**
 * ProductService.gs - Product CRUD with search, filter, cache
 */

var ProductService = (function() {

  var CACHE_KEY = 'products';
  var CACHE_KEY_WITH_PRICES = 'products_with_prices';

  function getProducts() {
    var cached = CacheHelper.get(CACHE_KEY);
    if (cached) return cached;
    var data = SheetHelper.getAll(SHEETS.PRODUCTS);
    CacheHelper.set(CACHE_KEY, data);
    return data;
  }

  function getProductById(id) {
    return SheetHelper.getById(SHEETS.PRODUCTS, id);
  }

  function createProduct(data) {
    Auth.requireAdmin();

    // Validate
    if (!data.name || !data.name.trim()) throw new Error('Tên sản phẩm không được để trống');
    if (!data.unit || !data.unit.trim()) throw new Error('Đơn vị không được để trống');

    var buyPrice = Number(data.buy_price) || 0;
    var sellPrice = Number(data.sell_price) || 0;
    if (buyPrice < 0) throw new Error('Giá nhập phải >= 0');
    if (sellPrice < 0) throw new Error('Giá bán phải >= 0');

    if (data.category_id) {
      var cat = CategoryService.getCategoryById(data.category_id);
      if (!cat) throw new Error('Danh mục không tồn tại');
    }

    // Check duplicate name
    var existing = getProducts();
    var dup = existing.some(function(p) {
      return p.name.toLowerCase() === data.name.trim().toLowerCase() && p.status === 'active';
    });
    if (dup) throw new Error('Sản phẩm "' + data.name + '" đã tồn tại');

    var record = {
      name: data.name.trim(),
      category_id: data.category_id || '',
      unit: data.unit.trim(),
      barcode: (data.barcode || '').trim(),
      description: (data.description || '').trim(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    var product = SheetHelper.create(SHEETS.PRODUCTS, record);

    // Create price row
    PriceService.createPrice(product.id, buyPrice, sellPrice);

    // Create inventory row
    InventoryService.createInventoryForProduct(product.id);

    // Invalidate caches
    CacheHelper.remove(CACHE_KEY);
    CacheHelper.remove(CACHE_KEY_WITH_PRICES);

    return product;
  }

  function updateProduct(id, data) {
    Auth.requireAdmin();
    var existing = getProductById(id);
    if (!existing) throw new Error('Sản phẩm không tồn tại');

    var updateData = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('Tên sản phẩm không được để trống');
      updateData.name = data.name.trim();
    }
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.unit !== undefined) updateData.unit = data.unit.trim();
    if (data.barcode !== undefined) updateData.barcode = data.barcode.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();

    var result = SheetHelper.update(SHEETS.PRODUCTS, id, updateData);

    // Update prices if provided
    if (data.buy_price !== undefined || data.sell_price !== undefined) {
      var currentPrice = PriceService.getPrice(id);
      var newBuy = data.buy_price !== undefined ? Number(data.buy_price) : (currentPrice ? Number(currentPrice.buy_price) : 0);
      var newSell = data.sell_price !== undefined ? Number(data.sell_price) : (currentPrice ? Number(currentPrice.sell_price) : 0);
      if (newBuy < 0) throw new Error('Giá nhập phải >= 0');
      if (newSell < 0) throw new Error('Giá bán phải >= 0');
      if (currentPrice) {
        PriceService.updatePrice(id, newBuy, newSell);
      } else {
        PriceService.createPrice(id, newBuy, newSell);
      }
    }

    CacheHelper.remove(CACHE_KEY);
    CacheHelper.remove(CACHE_KEY_WITH_PRICES);
    return result;
  }

  function deleteProduct(id) {
    Auth.requireAdmin();
    // Soft delete
    SheetHelper.update(SHEETS.PRODUCTS, id, {
      status: 'inactive',
      updated_at: new Date().toISOString()
    });
    CacheHelper.remove(CACHE_KEY);
    CacheHelper.remove(CACHE_KEY_WITH_PRICES);
    return { success: true };
  }

  function searchProducts(keyword) {
    if (!keyword) return getProducts().filter(function(p) { return p.status === 'active'; });
    var kw = keyword.toLowerCase();
    return getProducts().filter(function(p) {
      return p.status === 'active' && p.name.toLowerCase().indexOf(kw) !== -1;
    });
  }

  function filterByCategory(categoryId) {
    return getProducts().filter(function(p) {
      return p.status === 'active' && p.category_id === categoryId;
    });
  }

  function getProductsWithPrices() {
    var cached = CacheHelper.get(CACHE_KEY_WITH_PRICES);
    if (cached) return cached;

    var products = getProducts().filter(function(p) { return p.status === 'active'; });
    var prices = PriceService.getPrices();

    var priceMap = {};
    prices.forEach(function(pr) {
      priceMap[pr.product_id] = pr;
    });

    var result = products.map(function(p) {
      var price = priceMap[p.id] || {};
      return {
        id: p.id,
        name: p.name,
        category_id: p.category_id,
        unit: p.unit,
        barcode: String(p.barcode || ''),
        description: p.description,
        status: p.status,
        buy_price: Number(price.buy_price) || 0,
        sell_price: Number(price.sell_price) || 0,
        created_at: p.created_at,
        updated_at: p.updated_at
      };
    });

    CacheHelper.set(CACHE_KEY_WITH_PRICES, result);
    return result;
  }

  function bulkUpdateStatus(ids, status) {
    Auth.requireAdmin();
    ids.forEach(function(id) {
      SheetHelper.update(SHEETS.PRODUCTS, id, {
        status: status,
        updated_at: new Date().toISOString()
      });
    });
    CacheHelper.remove(CACHE_KEY);
    CacheHelper.remove(CACHE_KEY_WITH_PRICES);
    return { success: true, count: ids.length };
  }

  return {
    getProducts: getProducts,
    getProductById: getProductById,
    createProduct: createProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    searchProducts: searchProducts,
    filterByCategory: filterByCategory,
    getProductsWithPrices: getProductsWithPrices,
    bulkUpdateStatus: bulkUpdateStatus
  };

})();
