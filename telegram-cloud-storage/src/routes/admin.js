const router = require("express").Router();
const { protect, requireAdmin } = require("../middleware/auth");
const {
  updateRevenue,
  getSettlementHistory,
  getWithdrawals,
  updateWithdrawal,
  getUsers,
} = require("../controllers/adminMonetizationController");

router.use(protect, requireAdmin);
router.post("/revenue/update", updateRevenue);
router.get("/revenue/history", getSettlementHistory);
router.get("/withdrawals", getWithdrawals);
router.patch("/withdrawals/:id", updateWithdrawal);
router.get("/users", getUsers);

module.exports = router;
