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
// Bulk sync entire favorites array

// Bulk sync entire cart array


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
