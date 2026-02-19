/**
 * Auth.gs - Authentication & role-based access control
 */

var Auth = (function () {
  var _usersCache = null;

  function _getUsers() {
    if (!_usersCache) _usersCache = SheetHelper.getAll(SHEETS.USERS);
    return _usersCache;
  }

  function getCurrentUser() {
    var email = Session.getActiveUser().getEmail();
    if (!email) {
      throw new Error(
        "Không thể xác định người dùng. Vui lòng đảm bảo: " +
          "(1) Bạn đã đăng nhập Google, " +
          "(2) Bạn đã cấp quyền cho ứng dụng khi được hỏi, " +
          "(3) Sử dụng đúng URL deployment mới nhất (/exec).",
      );
    }
    return email;
  }

  function getUserRole(email) {
    var users = _getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) {
        return users[i].role;
      }
    }
    return null;
  }

  function _findUser(email) {
    var users = _getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) {
        return users[i];
      }
    }
    return null;
  }

  function isAdmin(email) {
    return getUserRole(email) === ROLES.ADMIN;
  }

  function requireAdmin() {
    var email = getCurrentUser();
    if (!isAdmin(email)) {
      throw new Error(
        "Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền admin.",
      );
    }
    return email;
  }

  function checkAccess() {
    var email = getCurrentUser();
    var user = _findUser(email);
    if (!user) {
      throw new Error(
        "Tài khoản " + email + " không có quyền truy cập hệ thống.",
      );
    }
    return user;
  }

  function getAuthInfo() {
    var email = getCurrentUser();
    var user = _findUser(email);
    if (!user) {
      throw new Error("Tài khoản " + email + " không có quyền truy cập.");
    }
    return {
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }

  return {
    getCurrentUser: getCurrentUser,
    getUserRole: getUserRole,
    isAdmin: isAdmin,
    requireAdmin: requireAdmin,
    checkAccess: checkAccess,
    getAuthInfo: getAuthInfo,
  };
})();
