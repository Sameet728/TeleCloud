const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  getWithdrawals,
  requestWithdrawal,
} = require("../controllers/walletController");

router.get("/", protect, getWithdrawals);
router.post("/", protect, requestWithdrawal);

module.exports = router;
