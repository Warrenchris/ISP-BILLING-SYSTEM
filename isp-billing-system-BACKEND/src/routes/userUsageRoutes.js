const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getUserDataUsage,
  getUserUsageHistory
} = require("../controllers/usersUsageController");

router.use(authenticate);

router.get("/:userId/data-usage", getUserDataUsage);
router.get("/:userId/usage-history", getUserUsageHistory);

module.exports = router;
