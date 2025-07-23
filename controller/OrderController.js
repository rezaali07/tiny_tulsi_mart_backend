const Order = require("../models/OrderModel");
const ErrorHandler = require("../utils/ErrorHandler.js");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Product = require("../models/productModel.js");
const OrderHistory = require("../models/Orders");

// create Order
exports.createOrder = catchAsyncErrors(async (req, res, next) => {
  const {
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  const order = await Order.create({
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paidAt: Date.now(),
    user: req.user._id,
  });

  res.status(201).json({
    success: true,
    order,
  });
});

// ceate order history ---- FFFFFFFFFFF
exports.createOrderHistory = catchAsyncErrors(async (req, res, next) => {

  console.log(req.body);
  const orderHistory = await OrderHistory.create({
    productName: req.body.ProductName,
    productPrice: req.body.ProductPrice,
    productImage: req.body.ProductImage,
    paymentType: req.body.PaymentType,
    address: req.body.Address,
    email: req.body.Email,

  });

  res.status(201).json({
    success: true,
    orderHistory,
  });
});

// get order history according to email
exports.getOrderHistory = catchAsyncErrors(async (req, res, next) => {
  console.log("req.params.id");
  console.log(req.params.id);
  const orderHistory = await OrderHistory.find({ email: req.params.id });
  if (!orderHistory) {
    return next(new ErrorHandler("Items Ordered not found from this id", 404));
  };
  res.status(200).json(orderHistory);
});





}); 




