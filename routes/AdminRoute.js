// routes/AdminRoute.js (create this new route file)
const express = require("express");
const router = express.Router();

const { getAuditLogs } = require("../controller/AdminController");
const { isAuthenticatedUser, authorizedRoles } = require("../middleware/auth");

// Only admins can access this route
router.get("/admin/audit-logs", isAuthenticatedUser, authorizedRoles("admin"), getAuditLogs);

module.exports = router;
