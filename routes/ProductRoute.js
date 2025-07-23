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

// Admin product routes
router
  .route("/admin/products")
  .get(isAuthenticatedUser, authorizedRoles("admin"), getAllProducts);

// Public product routes
router.route("/products").get(getAllProducts);
router.route("/product/:id").get(getSingleProduct);
// Bulk sync entire cart array
router.route("/cart").post(isAuthenticatedUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItems } = req.body;

    if (!Array.isArray(cartItems)) {
      return res.status(400).json({ success: false, message: "cartItems must be an array" });
    }

    // TODO: Implement logic to save cartItems array in your DB for userId
    // Example: await CartModel.updateOne({ user: userId }, { cartItems }, { upsert: true });

    return res.status(200).json({ success: true, message: "Cart synced successfully" });
  } catch (error) {
    console.error("Error syncing cart:", error);
    return res.status(500).json({ success: false, message: "Server error syncing cart" });
  }
});

// Bulk sync entire cart array
router.route("/cart").post(isAuthenticatedUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItems } = req.body;

    if (!Array.isArray(cartItems)) {
      return res.status(400).json({ success: false, message: "cartItems must be an array" });
    }

    // TODO: Implement logic to save cartItems array in your DB for userId
    // Example: await CartModel.updateOne({ user: userId }, { cartItems }, { upsert: true });

    return res.status(200).json({ success: true, message: "Cart synced successfully" });
  } catch (error) {
    console.error("Error syncing cart:", error);
    return res.status(500).json({ success: false, message: "Server error syncing cart" });
  }
});
// Bulk sync entire favorites array
router.route("/favorites").post(isAuthenticatedUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { favourites } = req.body;

    if (!Array.isArray(favourites)) {
      return res.status(400).json({ success: false, message: "favourites must be an array" });
    }

    // TODO: Implement logic to save favourites array in your DB for userId
    // Example: await FavoriteModel.updateOne({ user: userId }, { favourites }, { upsert: true });

    return res.status(200).json({ success: true, message: "Favorites synced successfully" });
  } catch (error) {
    console.error("Error syncing favorites:", error);
    return res.status(500).json({ success: false, message: "Server error syncing favorites" });
  }
});


module.exports = router;
