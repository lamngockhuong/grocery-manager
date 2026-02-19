/**
 * CategoryService.gs - Category CRUD with parent-child tree
 */

var CategoryService = (function () {
  var CACHE_KEY = "categories";

  function getCategories() {
    var cached = CacheHelper.get(CACHE_KEY);
    if (cached) return cached;
    var data = SheetHelper.getAll(SHEETS.CATEGORIES);
    CacheHelper.set(CACHE_KEY, data);
    return data;
  }

  function getCategoryById(id) {
    return SheetHelper.getById(SHEETS.CATEGORIES, id);
  }

  function getCategoryTree() {
    var categories = getCategories();
    var topLevel = [];
    var childMap = {};

    categories.forEach(function (cat) {
      cat.children = [];
      if (!cat.parent_id) {
        topLevel.push(cat);
      } else {
        if (!childMap[cat.parent_id]) childMap[cat.parent_id] = [];
        childMap[cat.parent_id].push(cat);
      }
    });

    topLevel.forEach(function (parent) {
      parent.children = childMap[parent.id] || [];
    });

    return topLevel;
  }

  function createCategory(data) {
    Auth.requireAdmin();
    if (!data.name || !data.name.trim()) {
      throw new Error("Tên danh mục không được để trống");
    }
    // Check duplicate name
    var existing = getCategories();
    var dup = existing.some(function (c) {
      return c.name.toLowerCase() === data.name.trim().toLowerCase();
    });
    if (dup) throw new Error('Danh mục "' + data.name + '" đã tồn tại');

    if (data.parent_id) {
      var parent = getCategoryById(data.parent_id);
      if (!parent) throw new Error("Danh mục cha không tồn tại");
    }

    var record = {
      name: data.name.trim(),
      parent_id: data.parent_id || "",
      created_at: new Date().toISOString(),
    };
    var result = SheetHelper.create(SHEETS.CATEGORIES, record);
    CacheHelper.remove(CACHE_KEY);
    return result;
  }

  function updateCategory(id, data) {
    Auth.requireAdmin();
    var existing = getCategoryById(id);
    if (!existing) throw new Error("Danh mục không tồn tại");

    var updateData = {};
    if (data.name !== undefined) {
      if (!data.name.trim())
        throw new Error("Tên danh mục không được để trống");
      updateData.name = data.name.trim();
    }
    if (data.parent_id !== undefined) {
      updateData.parent_id = data.parent_id;
    }

    var result = SheetHelper.update(SHEETS.CATEGORIES, id, updateData);
    CacheHelper.remove(CACHE_KEY);
    return result;
  }

  function deleteCategory(id) {
    Auth.requireAdmin();
    // Check if category has products
    var products = SheetHelper.getAll(SHEETS.PRODUCTS);
    var hasProducts = products.some(function (p) {
      return p.category_id === id && p.status === "active";
    });
    if (hasProducts) {
      throw new Error("Không thể xoá danh mục đang có sản phẩm");
    }

    // Check if category has children
    var categories = getCategories();
    var hasChildren = categories.some(function (c) {
      return c.parent_id === id;
    });
    if (hasChildren) {
      throw new Error("Không thể xoá danh mục đang có danh mục con");
    }

    SheetHelper.remove(SHEETS.CATEGORIES, id);
    CacheHelper.remove(CACHE_KEY);
    return { success: true };
  }

  return {
    getCategories: getCategories,
    getCategoryById: getCategoryById,
    getCategoryTree: getCategoryTree,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
  };
})();
