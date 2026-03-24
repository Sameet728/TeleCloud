/**
 * routes/search.js
 */

const router = require("express").Router();
const { search } = require("../controllers/searchController");
const { protect } = require("../middleware/auth");

router.get("/", protect, search);

module.exports = router;
