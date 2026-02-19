/**
 * CacheHelper.gs - CacheService wrapper with chunking for >100KB data
 */

var CacheHelper = (function() {

  var CHUNK_SIZE = 90000; // bytes, safe under 100KB CacheService limit

  function _getCache() {
    return CacheService.getScriptCache();
  }

  function get(key) {
    try {
      var cache = _getCache();
      var countStr = cache.get(key + '_count');

      // No chunks -> try single key
      if (!countStr) {
        var val = cache.get(key);
        return val ? JSON.parse(val) : null;
      }

      var count = parseInt(countStr, 10);
      var keys = [];
      for (var i = 0; i < count; i++) {
        keys.push(key + '_chunk_' + i);
      }

      var chunks = cache.getAll(keys);
      var assembled = '';
      for (var j = 0; j < count; j++) {
        var chunk = chunks[key + '_chunk_' + j];
        if (!chunk) return null; // Partial cache miss
        assembled += chunk;
      }
      return JSON.parse(assembled);
    } catch (e) {
      Logger.log('CacheHelper.get error: ' + e.message);
      return null;
    }
  }

  function set(key, data, ttl) {
    try {
      var cache = _getCache();
      ttl = ttl || CACHE_TTL;
      var jsonStr = JSON.stringify(data);

      // Remove old chunks first
      remove(key);

      if (jsonStr.length <= CHUNK_SIZE) {
        cache.put(key, jsonStr, ttl);
        return;
      }

      // Split into chunks
      var chunks = {};
      var count = Math.ceil(jsonStr.length / CHUNK_SIZE);
      for (var i = 0; i < count; i++) {
        chunks[key + '_chunk_' + i] = jsonStr.substr(i * CHUNK_SIZE, CHUNK_SIZE);
      }
      chunks[key + '_count'] = String(count);
      cache.putAll(chunks, ttl);
    } catch (e) {
      Logger.log('CacheHelper.set error: ' + e.message);
      // Cache failure is non-critical, continue without cache
    }
  }

  function remove(key) {
    try {
      var cache = _getCache();
      var countStr = cache.get(key + '_count');

      if (countStr) {
        var count = parseInt(countStr, 10);
        var keys = [key + '_count'];
        for (var i = 0; i < count; i++) {
          keys.push(key + '_chunk_' + i);
        }
        cache.removeAll(keys);
      }

      cache.remove(key);
    } catch (e) {
      Logger.log('CacheHelper.remove error: ' + e.message);
    }
  }

  function invalidate(prefix) {
    // CacheService doesn't support prefix removal, so remove known keys
    try {
      remove(prefix);
    } catch (e) {
      Logger.log('CacheHelper.invalidate error: ' + e.message);
    }
  }

  return {
    get: get,
    set: set,
    remove: remove,
    invalidate: invalidate
  };

})();
