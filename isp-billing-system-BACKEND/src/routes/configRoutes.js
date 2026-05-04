const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getRoles, getUserStatuses } = require("../controllers/configController");

router.use(authenticate);

router.get("/roles", getRoles);
router.get("/user-statuses", getUserStatuses);

module.exports = router;
