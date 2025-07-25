// routes/AdminRoute.js (create this new route file)
const express = require("express");
const router = express.Router();

const { getAuditLogs } = require("../controller/AdminController");
const { isAuthenticatedUser, authorizedRoles } = require("../middleware/auth");



module.exports = router;
