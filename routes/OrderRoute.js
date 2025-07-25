const express = require("express");
const {
  createOrder,
  getSingleOrder,
  getAllOrders,

  deleteOrderAdmin,
  createOrderHistory,
  getOrderHistory,
} = require("../controller/OrderController");
const { isAuthenticatedUser, authorizedRoles } = require("../middleware/auth");
const router = express.Router();

router.route("/order/new").post(isAuthenticatedUser, createOrder);
router.route("/order/:id").get(isAuthenticatedUser, getSingleOrder);
router.route("/orders/me").get(isAuthenticatedUser, getAllOrders);


router
  .route("/admin/order/:id")
  .delete(isAuthenticatedUser, authorizedRoles("admin"), deleteOrderAdmin);

// ==========================================================------
router.route("/order/flutter/create").post(createOrderHistory);
router.route("/order/flutter/:id").get(getOrderHistory);
module.exports = router;
// ======================================-------------------------


