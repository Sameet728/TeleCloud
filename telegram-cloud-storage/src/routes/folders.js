/**
 * routes/folders.js
 */

const router = require("express").Router();
const ctrl   = require("../controllers/folderController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/",     ctrl.listFolders);
router.post("/",    ctrl.createFolder);
router.get("/:id",  ctrl.getFolder);
router.put("/:id",  ctrl.updateFolder);
router.delete("/:id", ctrl.deleteFolder);

module.exports = router;
