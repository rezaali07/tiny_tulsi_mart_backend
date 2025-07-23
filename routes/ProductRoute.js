const express = require("express");
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSingleProduct,
  createProductReview,
  getSingleProductReviews,
  deleteProductReview,

  addToFavorites,
  removeFromFavorites,
  addToCart,
  updateCartItem,
  removeFromCart,
  buyProducts,
} = require("../controller/ProductController");
const { isAuthenticatedUser, authorizedRoles, auth } = require("../middleware/auth");
const router = express.Router();

// Public product routes
router.route("/products").get(getAllProducts);
router.route("/product/:id").get(getSingleProduct);


module.exports = router;
