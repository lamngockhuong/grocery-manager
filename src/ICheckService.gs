/**
 * ICheckService.gs - Lookup product info from iCheck API by barcode
 */

var ICheckService = (function() {
  var BASE_URL = 'https://api-social.icheck.com.vn';

  function _generateDeviceId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < 32; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  function _fetch(url, options) {
    try {
      var response = UrlFetchApp.fetch(url, Object.assign({
        muteHttpExceptions: true
      }, options));
      var code = response.getResponseCode();
      if (code < 200 || code >= 300) {
        Logger.log('ICheckService._fetch error: HTTP ' + code + ' for ' + url);
        return null;
      }
      return JSON.parse(response.getContentText());
    } catch (e) {
      Logger.log('ICheckService._fetch error: ' + e.message);
      return null;
    }
  }

  var CACHE_KEY = 'icheck_anon_token';
  var CACHE_TTL = 300; // 5 minutes

  function _getToken() {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(CACHE_KEY);
    if (cached) return cached;

    var result = _fetch(BASE_URL + '/login/anonymous', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ os: 3, deviceId: _generateDeviceId() })
    });
    var token = result && result.data ? result.data.token : null;
    if (token) {
      cache.put(CACHE_KEY, token, CACHE_TTL);
    }
    return token;
  }

  function _searchByBarcode(token, barcode) {
    var url = BASE_URL + '/social/api/products/search'
      + '?nameCode=' + encodeURIComponent(barcode)
      + '&limit=48&offset=0';
    var result = _fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!result || !result.data || !result.data.rows || result.data.rows.length === 0) {
      return null;
    }
    return result.data.rows[0];
  }

  function _getProductDetail(token, code) {
    var url = BASE_URL + '/social/api/products/code/'
      + encodeURIComponent(code)
      + '?layout=product-detail';
    var result = _fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!result || !result.data) return null;
    return result.data;
  }

  function _extractImageUrl(product) {
    if (!product.media || !product.media.length) return '';
    for (var i = 0; i < product.media.length; i++) {
      if (product.media[i].type === 'image' && product.media[i].content) {
        return product.media[i].content;
      }
    }
    return '';
  }

  function lookupBarcode(barcode) {
    if (!barcode || !String(barcode).trim()) return null;
    var cleaned = String(barcode).trim();
    if (!/^\d{8,14}$/.test(cleaned)) return null;

    var token = _getToken();
    if (!token) {
      Logger.log('ICheckService: Failed to get anonymous token');
      return null;
    }

    var searchResult = _searchByBarcode(token, cleaned);
    if (!searchResult) return null;

    var detail = _getProductDetail(token, searchResult.code);
    if (!detail || !detail.basicInfo) return null;

    var info = detail.basicInfo;
    return {
      name: info.name || '',
      barcode: info.barcode || cleaned,
      price: Number(info.price) || 0,
      imageUrl: _extractImageUrl(detail)
    };
  }

  return {
    lookupBarcode: lookupBarcode
  };
})();
