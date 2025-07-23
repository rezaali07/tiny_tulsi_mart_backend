const express = require("express");
const {
  Payment,
  sendStripeApiKey,
} = require("../controller/PaymentController");
const router = express.Router();


module.exports = router;
