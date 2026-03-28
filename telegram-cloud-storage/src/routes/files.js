/**
 * routes/files.js
 */

const router = require("express").Router();
const ctrl   = require("../controllers/fileController");
const { protect }       = require("../middleware/auth");
const checkStorageLimit = require("../middleware/checkStorageLimit");

router.use(protect);

router.get("/",              ctrl.listFiles);
router.post("/upload/init",  checkStorageLimit, ctrl.initUpload);
router.post("/upload/chunk", checkStorageLimit, ctrl.uploadChunk);
router.post("/upload/finalize", checkStorageLimit, ctrl.finalizeUpload);
router.post("/bulk-delete",  ctrl.bulkDelete);
router.post("/zip-token",    ctrl.getZipToken);
router.get("/download-zip",  ctrl.downloadZip);
router.post("/move",         ctrl.moveFiles);
router.get("/:id/download",  ctrl.downloadFile);
router.get("/:id/preview",   ctrl.previewFile);
router.get("/:id/thumbnail", ctrl.getThumbnail);
router.put("/:id",           ctrl.updateFile);
router.delete("/:id",        ctrl.deleteFile);

module.exports = router;
