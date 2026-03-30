const router = require("express").Router();
const { optionalProtect } = require("../middleware/auth");
const {
  trackView,
  trackImpression,
  trackClick,
} = require("../controllers/monetizationController");

router.use(optionalProtect);
router.post("/view", trackView);
router.post("/impression", trackImpression);
router.post("/click", trackClick);

module.exports = router;
