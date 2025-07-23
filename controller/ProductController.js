const Product = require("../models/productModel.js");
const User = require("../models/UserModel.js");
const ErrorHandler = require("../utils/ErrorHandler.js");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Features = require("../utils/Features.js");
const cloudinary = require("cloudinary");

// create Product --admin
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  let images = [];

  if (typeof req.body.images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }

  const imagesLinks = [];

  for (let i = 0; i < images.length; i++) {
    const result = await cloudinary.v2.uploader.upload(images[i], {
      folder: "products",
    });

    imagesLinks.push({
      public_id: result.public_id,
      url: result.secure_url,
    });
  }

  req.body.images = imagesLinks;
  req.body.user = req.user.id;

  const product = await Product.create(req.body);
  res.status(201).json({
    success: true,
    product,
  });
});

// get all products
exports.getAllProducts = catchAsyncErrors(async (req, res) => {
  const resultPerPage = 8;
  const productsCount = await Product.countDocuments();

  const features = new Features(Product.find(), req.query)
    .search()
    .filter()
    .pagination(resultPerPage);
  const products = await features.query;

  res.status(200).json({
    success: true,
    products,
    resultPerPage,
    productsCount,
  });
});

// update product --admin
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("Product of this id not found", 404));
  }

  let images = [];

  if (typeof req.body.images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }

  if (images !== undefined) {
    // Delete image from cloudinary
    for (let i = 0; i < product.images.length; i++) {
      await cloudinary.v2.uploader.destroy(product.images[i].public_id);
    }

    const imagesLinks = [];

    for (let i = 0; i < images.length; i++) {
      const result = await cloudinary.v2.uploader.upload(images[i], {
        folder: "products",
      });
      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }
    req.body.images = imagesLinks;
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useUnified: false,
  });
  res.status(200).json({
    success: true,
    product,
  });
});

// delete product --admin
// exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
//   const product = await Product.findById(req.params.id);
//   if (!product) {
//     return next(new ErrorHandler("Product of this id not found", 404));
//   }
//   // Delete image from cloudinary
//   for (let i = 0; i < product.images.length; i++) {
//     await cloudinary.v2.uploader.destroy(product.images[i].public_id);
//   }

//   await product.remove();
//   res.status(200).json({
//     success: true,
//     message: "Product is deleted successfully",
//   });
// });

exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  console.log("🔄 Deleting product with ID:", req.params.id);

  const product = await Product.findById(req.params.id);

  if (!product) {
    console.warn("⚠️ Product not found for ID:", req.params.id);
    return next(new ErrorHandler("Product of this id not found", 404));
  }

  console.log("✅ Product found:", product.name || product._id);

  // Delete images from Cloudinary
  if (Array.isArray(product.images)) {
    console.log("🖼️ Deleting product images from Cloudinary...");
    for (const img of product.images) {
      if (img?.public_id) {
        try {
          console.log(`🧹 Destroying image with public_id: ${img.public_id}`);
          await cloudinary.v2.uploader.destroy(img.public_id);
        } catch (err) {
          console.error("❌ Error deleting image:", err.message);
        }
      }
    }
  }

  // Delete product from MongoDB
  try {
    await Product.deleteOne({ _id: product._id });
    console.log("✅ Product deleted from database");

    res.status(200).json({
      success: true,
      message: "Product is deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting product from DB:", err.message);
    return next(new ErrorHandler("Failed to delete product", 500));
  }
});






// single product details --admin
exports.getSingleProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("Product of this id not found", 404));
  }
  res.status(200).json({
    success: true,
    product,
  });
});

// create and update review
exports.createProductReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, productId } = req.body;

  const review = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  const product = await Product.findById(productId);

  const isReviewed = product.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );

  if (isReviewed) {
    product.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user._id.toString()) {
        rev.rating = rating;
        rev.comment = comment;
      }
    });
  } else {
    product.reviews.push(review);
    product.NoOfReviews = product.reviews.length;
  }

  let avg = 0;

  product.reviews.forEach((rev) => {
    avg += rev.rating;
  });

  product.ratings = avg / product.reviews.length;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

// get all reviews of single product
exports.getSingleProductReviews = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.query.id);
  if (!product) {
    return next(new ErrorHandler("Product of this id not found", 404));
  }
  res.status(200).json({
    success: true,
    reviews: product.reviews,
  });
});

// delete review -- admin
exports.deleteProductReview = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.query.productId);
  if (!product) {
    return next(new ErrorHandler("Product of this id not found", 404));
  }

  const reviews = product.reviews.filter(
    (rev) => rev._id.toString() !== req.query.id.toString()
  );

  let avg = 0;

  reviews.forEach((rev) => {
    avg += rev.rating;
  });

  let ratings = 0;

  if (reviews.length === 0) {
    ratings = 0;
  } else {
    ratings = avg / reviews.length;
  }

  const NoOfReviews = reviews.length;
  await Product.findByIdAndUpdate(
    req.query.productId,
    {
      reviews,
      ratings,
      NoOfReviews,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res.status(200).json({
    success: true,
  });
});

/* ===== New functions for favorites, cart and buying ===== */

// Add product to favorites
exports.addToFavorites = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const productId = req.params.id;

  const user = await User.findById(userId);

  if (user.favorites.includes(productId)) {
    return next(new ErrorHandler("Product already in favorites", 400));
  }

  user.favorites.push(productId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Product added to favorites",
    favorites: user.favorites,
  });
});

// Remove product from favorites
exports.removeFromFavorites = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const productId = req.params.id;

  const user = await User.findById(userId);

  user.favorites = user.favorites.filter(
    (fav) => fav.toString() !== productId.toString()
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: "Product removed from favorites",
    favorites: user.favorites,
  });
});

// Add product to cart (or update quantity if exists)
exports.addToCart = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const productId = req.params.id;
  const quantity = Number(req.body.quantity) || 1;

  const user = await User.findById(userId);

  const cartItemIndex = user.cart.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  if (cartItemIndex > -1) {
    // Update quantity
    user.cart[cartItemIndex].quantity += quantity;
  } else {
    // Add new product to cart
    user.cart.push({ product: productId, quantity });
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Product added to cart",
    cart: user.cart,
  });
});

// Update quantity of a product in cart
exports.updateCartItem = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const productId = req.params.id;
  const quantity = Number(req.body.quantity);

  if (quantity < 1) {
    return next(new ErrorHandler("Quantity must be at least 1", 400));
  }

  const user = await User.findById(userId);

  const cartItemIndex = user.cart.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  if (cartItemIndex === -1) {
    return next(new ErrorHandler("Product not found in cart", 404));
  }

  user.cart[cartItemIndex].quantity = quantity;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Cart updated",
    cart: user.cart,
  });
});

// Remove product from cart
exports.removeFromCart = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const productId = req.params.id;

  const user = await User.findById(userId);

  user.cart = user.cart.filter(
    (item) => item.product.toString() !== productId.toString()
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: "Product removed from cart",
    cart: user.cart,
  });
});

// Buy products (from cart or favorites)
exports.buyProducts = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  // productIds array: either from req.body.productIds or buy all from cart/favorites if empty
  const { productIds } = req.body; // optional array of productIds user wants to buy

  const user = await User.findById(userId).populate("cart.product").populate("favorites");

  let productsToBuy = [];

  if (productIds && productIds.length > 0) {
    // Buy specified products - check if they exist in cart or favorites
    productsToBuy = user.cart
      .filter((item) => productIds.includes(item.product._id.toString()))
      .map((item) => ({ product: item.product, quantity: item.quantity }));

    // Also check favorites if not in cart?
    // (Assuming buy from cart only)
  } else {
    // Buy all products in cart
    productsToBuy = user.cart.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));
  }

  if (productsToBuy.length === 0) {
    return next(new ErrorHandler("No products to buy", 400));
  }

  // Here, implement your buying logic (payment, stock check, order creation, etc.)
  // For now, we simulate a successful buy by clearing the bought products from cart

  // Remove bought products from cart
  productsToBuy.forEach(({ product }) => {
    user.cart = user.cart.filter(
      (item) => item.product._id.toString() !== product._id.toString()
    );
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: "Purchase successful",
    purchasedProducts: productsToBuy,
  });
});


// Bulk sync entire cart array
exports.syncCart = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const { cartItems } = req.body;

  if (!Array.isArray(cartItems)) {
    return next(new ErrorHandler("cartItems must be an array", 400));
  }

  // Validate and map items: ensure product and quantity exist and quantity > 0
  const validatedCart = cartItems.filter(item =>
    item.product && item.quantity && item.quantity > 0
  );

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  user.cart = validatedCart;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Cart synced successfully",
    cart: user.cart,
  });
});

// Bulk sync entire favorites array
exports.syncFavorites = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const { favourites } = req.body;

  if (!Array.isArray(favourites)) {
    return next(new ErrorHandler("favourites must be an array", 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  user.favorites = favourites;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Favorites synced successfully",
    favorites: user.favorites,
  });
});
