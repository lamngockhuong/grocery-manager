/**
 * ReportService.gs - Dashboard stats and report generation
 */

var ReportService = (function() {

  function getDashboardStats() {
    var products = ProductService.getProductsWithPrices();
    var inventory = InventoryService.getInventory();
    var recentChanges = PriceService.getRecentPriceChanges(5);

    // Join product names to recent changes
    var productMap = {};
    products.forEach(function(p) { productMap[p.id] = p.name; });
    recentChanges = recentChanges.map(function(c) {
      c.product_name = productMap[c.product_id] || c.product_id;
      return c;
    });

    var lowStock = inventory.filter(function(i) { return i.quantity < i.min_stock; });
    var totalValue = inventory.reduce(function(sum, i) {
      var product = products.find(function(p) { return p.id === i.product_id; });
      return sum + (i.quantity * (product ? product.sell_price : 0));
    }, 0);

    return {
      totalProducts: products.length,
      totalValue: totalValue,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock.slice(0, 5),
      recentChanges: recentChanges
    };
  }

  function getLowStockReport() {
    var inventory = InventoryService.getInventory();
    var products = ProductService.getProducts();
    var categories = CategoryService.getCategories();

    var catMap = {};
    categories.forEach(function(c) { catMap[c.id] = c.name; });
    var productMap = {};
    products.forEach(function(p) { productMap[p.id] = p; });

    return inventory
      .filter(function(i) { return i.quantity < i.min_stock; })
      .map(function(i) {
        var product = productMap[i.product_id] || {};
        return {
          product_name: i.product_name || product.name || '',
          category: catMap[product.category_id] || '',
          quantity: i.quantity,
          min_stock: i.min_stock,
          deficit: i.min_stock - i.quantity
        };
      })
      .sort(function(a, b) { return b.deficit - a.deficit; });
  }

  function getPriceHistoryReport(productId, startDate, endDate) {
    var history = PriceService.getPriceHistory(productId, startDate, endDate);
    var products = ProductService.getProducts();

    var productMap = {};
    products.forEach(function(p) { productMap[p.id] = p.name; });

    return history.map(function(h) {
      h.product_name = productMap[h.product_id] || h.product_id;
      return h;
    });
  }

  function getInventorySummaryReport() {
    var inventory = InventoryService.getInventory();
    var products = ProductService.getProductsWithPrices();
    var categories = CategoryService.getCategoryTree();

    var productMap = {};
    products.forEach(function(p) { productMap[p.id] = p; });

    // Group by category
    var catGroups = {};
    inventory.forEach(function(i) {
      var product = productMap[i.product_id];
      if (!product) return;
      var catId = product.category_id || 'uncategorized';
      if (!catGroups[catId]) {
        catGroups[catId] = { product_count: 0, total_quantity: 0, total_value: 0 };
      }
      catGroups[catId].product_count++;
      catGroups[catId].total_quantity += i.quantity;
      catGroups[catId].total_value += i.quantity * (product.sell_price || 0);
    });

    // Build flat category name map
    var catNameMap = { uncategorized: 'Chua phan loai' };
    var allCats = CategoryService.getCategories();
    allCats.forEach(function(c) { catNameMap[c.id] = c.name; });

    return Object.keys(catGroups).map(function(catId) {
      var g = catGroups[catId];
      return {
        category_name: catNameMap[catId] || catId,
        product_count: g.product_count,
        total_quantity: g.total_quantity,
        total_value: g.total_value
      };
    });
  }

  return {
    getDashboardStats: getDashboardStats,
    getLowStockReport: getLowStockReport,
    getPriceHistoryReport: getPriceHistoryReport,
    getInventorySummaryReport: getInventorySummaryReport
  };

})();
