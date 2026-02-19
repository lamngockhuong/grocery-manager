/**
 * ImageService.gs - Product image upload/delete via Google Drive
 */
var ImageService = (function () {
  function _getOrCreateFolder() {
    var folders = DriveApp.getFoldersByName(DRIVE.FOLDER_NAME);
    if (folders.hasNext()) return folders.next();
    var folder = DriveApp.createFolder(DRIVE.FOLDER_NAME);
    folder.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW,
    );
    return folder;
  }

  function _isDriveUrl(url) {
    return url && url.indexOf("drive.google.com") !== -1;
  }

  function _extractFileId(url) {
    // Handle: https://drive.google.com/uc?id=FILE_ID&export=view
    var match = url.match(/[?&]id=([^&]+)/);
    if (match) return match[1];
    // Handle: https://drive.google.com/file/d/FILE_ID/view
    match = url.match(/\/d\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  function uploadImage(base64Data, fileName, mimeType) {
    var sizeBytes = Math.ceil((base64Data.length * 3) / 4);
    if (sizeBytes > DRIVE.MAX_FILE_SIZE) {
      throw new Error("File quá lớn. Tối đa 2MB.");
    }

    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType || "image/jpeg", fileName);
    var folder = _getOrCreateFolder();
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w800";
  }

  function deleteImage(imageUrl) {
    if (!_isDriveUrl(imageUrl)) return;
    var fileId = _extractFileId(imageUrl);
    if (!fileId) return;
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (e) {
      Logger.log("ImageService.deleteImage: " + e.message);
    }
  }

  // Clean up orphaned images in current user's Drive folder
  function cleanupOrphanImages() {
    var folders = DriveApp.getFoldersByName(DRIVE.FOLDER_NAME);
    if (!folders.hasNext()) return { deleted: 0, total: 0 };

    // Collect active image file IDs from sheet
    var products = SheetHelper.getAll(SHEETS.PRODUCTS);
    var activeIds = {};
    products.forEach(function (p) {
      if (p.image_url && _isDriveUrl(p.image_url)) {
        var fid = _extractFileId(p.image_url);
        if (fid) activeIds[fid] = true;
      }
    });

    // Scan folder and trash orphans
    var folder = folders.next();
    var files = folder.getFiles();
    var deleted = 0;
    var total = 0;
    while (files.hasNext()) {
      var file = files.next();
      total++;
      if (!activeIds[file.getId()]) {
        file.setTrashed(true);
        deleted++;
      }
    }
    return { deleted: deleted, total: total };
  }

  return {
    uploadImage: uploadImage,
    deleteImage: deleteImage,
    cleanupOrphanImages: cleanupOrphanImages,
  };
})();
