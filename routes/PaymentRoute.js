const express = require("express");
const {
  Payment,
  sendStripeApiKey,
} = require("../controller/PaymentController");
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");



module.exports = router;
