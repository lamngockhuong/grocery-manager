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

    return "https://drive.google.com/uc?id=" + file.getId() + "&export=view";
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

  return {
    uploadImage: uploadImage,
    deleteImage: deleteImage,
  };
})();
