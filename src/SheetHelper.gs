/**
 * SheetHelper.gs - Generic CRUD utilities for Google Sheets
 */

var SheetHelper = (function() {

  function _getSpreadsheet() {
    if (SPREADSHEET_ID) {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function getSheet(sheetName) {
    var ss = _getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found');
    }
    return sheet;
  }

  function _getHeaders(sheet) {
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  function _rowToObject(headers, row) {
    var obj = {};
    headers.forEach(function(h, i) {
      obj[h] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  }

  function _objectToRow(headers, obj) {
    return headers.map(function(h) {
      return obj[h] !== undefined ? obj[h] : '';
    });
  }

  function generateId(prefix) {
    return (prefix || '') + Utilities.getUuid().replace(/-/g, '').substr(0, 12);
  }

  function getAll(sheetName) {
    try {
      var sheet = getSheet(sheetName);
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) return [];
      var headers = _getHeaders(sheet);
      var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      return data
        .map(function(row) { return _rowToObject(headers, row); })
        .filter(function(obj) { return obj[headers[0]] !== ''; });
    } catch (e) {
      Logger.log('SheetHelper.getAll error: ' + e.message);
      throw e;
    }
  }

  function getById(sheetName, id) {
    try {
      var sheet = getSheet(sheetName);
      var headers = _getHeaders(sheet);
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) return null;
      var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          return _rowToObject(headers, data[i]);
        }
      }
      return null;
    } catch (e) {
      Logger.log('SheetHelper.getById error: ' + e.message);
      throw e;
    }
  }

  function create(sheetName, data) {
    try {
      var sheet = getSheet(sheetName);
      var headers = _getHeaders(sheet);
      var prefix = ID_PREFIXES[sheetName] || '';
      if (!data.id) {
        data.id = generateId(prefix);
      }
      var row = _objectToRow(headers, data);
      sheet.appendRow(row);
      return data;
    } catch (e) {
      Logger.log('SheetHelper.create error: ' + e.message);
      throw e;
    }
  }

  function update(sheetName, id, data) {
    try {
      var sheet = getSheet(sheetName);
      var headers = _getHeaders(sheet);
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) throw new Error('No data in sheet');
      var allData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (var i = 0; i < allData.length; i++) {
        if (String(allData[i][0]) === String(id)) {
          var existing = _rowToObject(headers, allData[i]);
          // Merge data
          Object.keys(data).forEach(function(key) {
            existing[key] = data[key];
          });
          var newRow = _objectToRow(headers, existing);
          sheet.getRange(i + 2, 1, 1, headers.length).setValues([newRow]);
          return existing;
        }
      }
      throw new Error('Record with id "' + id + '" not found in ' + sheetName);
    } catch (e) {
      Logger.log('SheetHelper.update error: ' + e.message);
      throw e;
    }
  }

  function remove(sheetName, id) {
    try {
      var sheet = getSheet(sheetName);
      var headers = _getHeaders(sheet);
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) return false;
      var allData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (var i = 0; i < allData.length; i++) {
        if (String(allData[i][0]) === String(id)) {
          sheet.deleteRow(i + 2);
          return true;
        }
      }
      return false;
    } catch (e) {
      Logger.log('SheetHelper.remove error: ' + e.message);
      throw e;
    }
  }

  function query(sheetName, filterFn) {
    var all = getAll(sheetName);
    return all.filter(filterFn);
  }

  return {
    getSheet: getSheet,
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    remove: remove,
    query: query,
    generateId: generateId
  };

})();
