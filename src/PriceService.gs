/**
 * PriceService.gs - Price CRUD with auto PriceHistory logging
 */

var PriceService = (function () {
  var CACHE_KEY = "prices";

  function getPrices() {
    var cached = CacheHelper.get(CACHE_KEY);
    if (cached) return cached;
    var data = SheetHelper.getAll(SHEETS.PRICES);
    CacheHelper.set(CACHE_KEY, data);
    return data;
  }

  function getPrice(productId) {
    var prices = getPrices();
    for (var i = 0; i < prices.length; i++) {
      if (prices[i].product_id === productId) return prices[i];
    }
    return null;
  }

  function createPrice(productId, buyPrice, sellPrice) {
    var email = Auth.getCurrentUser();
    var record = {
      product_id: productId,
      buy_price: Number(buyPrice) || 0,
      sell_price: Number(sellPrice) || 0,
      updated_at: new Date().toISOString(),
      updated_by: email,
    };
    var result = SheetHelper.create(SHEETS.PRICES, record);
    CacheHelper.remove(CACHE_KEY);
    CacheHelper.remove("products_with_prices");
    return result;
  }

  function updatePrice(productId, newBuyPrice, newSellPrice) {
    var email = Auth.requireAdmin();

    // Validate
    newBuyPrice = Number(newBuyPrice);
    newSellPrice = Number(newSellPrice);
    if (isNaN(newBuyPrice) || newBuyPrice < 0)
      throw new Error("Giá nhập phải >= 0");
    if (isNaN(newSellPrice) || newSellPrice < 0)
      throw new Error("Giá bán phải >= 0");

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // Get current price (fresh read under lock)
      var current = getPrice(productId);
      if (!current)
        throw new Error("Không tìm thấy giá cho sản phẩm " + productId);

      var oldBuy = Number(current.buy_price) || 0;
      var oldSell = Number(current.sell_price) || 0;

      // Update Prices sheet
      SheetHelper.update(SHEETS.PRICES, current.id, {
        buy_price: newBuyPrice,
        sell_price: newSellPrice,
        updated_at: new Date().toISOString(),
        updated_by: email,
      });

      // Log to PriceHistory
      SheetHelper.create(SHEETS.PRICE_HISTORY, {
        product_id: productId,
        old_buy: oldBuy,
        new_buy: newBuyPrice,
        old_sell: oldSell,
        new_sell: newSellPrice,
        changed_at: new Date().toISOString(),
        changed_by: email,
      });

      // Invalidate caches
      CacheHelper.remove(CACHE_KEY);
      CacheHelper.remove("products_with_prices");

      return {
        product_id: productId,
        buy_price: newBuyPrice,
        sell_price: newSellPrice,
      };
    } finally {
      lock.releaseLock();
    }
  }

  function getPriceHistory(productId, startDate, endDate) {
    var history = SheetHelper.getAll(SHEETS.PRICE_HISTORY);

    if (productId) {
      history = history.filter(function (h) {
        return h.product_id === productId;
      });
    }
    if (startDate) {
      var start = new Date(startDate);
      history = history.filter(function (h) {
        return new Date(h.changed_at) >= start;
      });
    }
    if (endDate) {
      var end = new Date(endDate);
      end.setHours(23, 59, 59);
      history = history.filter(function (h) {
        return new Date(h.changed_at) <= end;
      });
    }

    history.sort(function (a, b) {
      return new Date(b.changed_at) - new Date(a.changed_at);
    });

    return history;
  }

  function getRecentPriceChanges(limit) {
    var history = SheetHelper.getAll(SHEETS.PRICE_HISTORY);
    history.sort(function (a, b) {
      return new Date(b.changed_at) - new Date(a.changed_at);
    });
    return history.slice(0, limit || 5);
  }

  return {
    getPrices: getPrices,
    getPrice: getPrice,
    createPrice: createPrice,
    updatePrice: updatePrice,
    getPriceHistory: getPriceHistory,
    getRecentPriceChanges: getRecentPriceChanges,
  };
})();
