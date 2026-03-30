const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  getWallet,
  getWithdrawals,
  requestWithdrawal,
} = require("../controllers/walletController");

router.get("/", protect, getWallet);
router.get("/withdrawals", protect, getWithdrawals);
router.post("/withdrawals", protect, requestWithdrawal);

module.exports = router;
