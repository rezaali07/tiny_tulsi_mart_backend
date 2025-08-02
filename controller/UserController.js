
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const ErrorHandler = require("../utils/ErrorHandler.js");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendMail");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const AuditLog = require("../models/AuditLogModel.js");
const validateBase64Image = require("../utils/validateBase64Image");
const isStrongPassword = require("../utils/passwordValidator");
const otpGenerator = require("otp-generator"); // Needed for OTP generation

// Register user (unchanged)
exports.createUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, avatar: avatarData } = req.body;

  if (!isStrongPassword(password)) {
    return next(
      new ErrorHandler(
        "Password must include uppercase, lowercase, number, and symbol",
        400
      )
    );
  }

  let avatar = {
    public_id: "samples/man-portrait",
    url: "https://res.cloudinary.com/dig1ixe4q/image/upload/v1732525014/samples/man-portrait.jpg",
  };

  if (avatarData) {
    if (!validateBase64Image(avatarData)) {
      return next(new ErrorHandler("Invalid or unsupported image type", 400));
    }

    const uploaded = await cloudinary.uploader.upload(avatarData, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });

    avatar = {
      public_id: uploaded.public_id,
      url: uploaded.secure_url,
    };
  }

  const user = await User.create({ name, email, password, avatar });

  await AuditLog.create({
    user: user._id,
    action: "register",
    details: `User registered with email: ${email}`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  sendToken(user, 201, res);
});

// Updated loginUser with 2FA and device trust logic
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please enter email & password", 400));
  }

  if (!deviceId) {
    return next(new ErrorHandler("Device ID is required for login", 400));
  }

  // Fetch user with needed fields including trustedDevices
  const user = await User.findOne({ email }).select(
    "+password +loginAttempts +isLocked +trustedDevices +otp +otpExpires"
  );

  if (!user) {
    return next(new ErrorHandler("User not found with this email", 401));
  }

  if (user.isLocked) {
    return next(
      new ErrorHandler(
        "Account is locked due to too many failed login attempts(exceed 5 times). Please reset your password to unlock.",
        403
      )
    );
  }

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    await user.incrementLoginAttempts();
    return next(new ErrorHandler("Invalid password", 401));
  }

  await user.resetLoginAttempts();

  // Check if device is trusted
  if (user.trustedDevices && user.trustedDevices.includes(deviceId)) {
    

    const token = user.getJwtToken();

    user.sessions.push({
      token,
      ip: req.ip,
      device: req.headers["user-agent"] || "Unknown",
      createdAt: new Date(),
      lastActive: new Date(),
    });
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: "login",
      details: `User logged in`,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "Unknown",
    });

    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      token,
      user,
      requiresOtp: false,
    });
  } else {
    // New device detected → generate and send OTP

    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    const message = `Your OTP for login is: ${otp}\nIt is valid for 5 minutes.`;
    await sendEmail({
      email,
      subject: "TinyTulsiMart - Login OTP Verification",
      message,
    });

    return res.status(200).json({
      success: true,
      message:
        "New device detected. Please verify OTP sent to your email to continue login.",
      requiresOtp: true,
    });
  }
});


/// List active sessions
exports.getUserSessions = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const currentToken =
    req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

  const sessions = user.sessions.map((session) => ({
    token: session.token,
    ip: session.ip,
    device: session.device,
    lastActive: session.lastActive,
    isCurrentSession: session.token === currentToken,
  }));

  res.status(200).json({ success: true, sessions });
});







// Logout one session
exports.logoutSessionByToken = catchAsyncErrors(async (req, res, next) => {
  const token = req.params.token;
  if (!token) return next(new ErrorHandler("Session token is required", 400));

  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.sessions = user.sessions.filter((s) => s.token !== token);
  await user.save();

  await AuditLog.create({
    user: req.user._id,
    action: "logout-session",
    details: `User logged out of session with token: ${token}`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, message: "Session terminated" });
});

// Get current token
exports.getCurrentToken = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return next(new ErrorHandler("No token found", 401));
  res.status(200).json({ success: true, token });
});

// Logout all sessions
exports.logoutAllSessions = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.sessions = [];
  await user.save();

  await AuditLog.create({
    user: req.user._id,
    action: "logout-all",
    details: `User logged out of all sessions`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.clearCookie("token");

  res.status(200).json({ success: true, message: "Logged out from all devices" });
});

// Logout user (current session)
exports.logoutUser = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) return next(new ErrorHandler("No token provided", 400));
  if (!req.user) return next(new ErrorHandler("User not authenticated", 401));

  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.sessions = user.sessions.filter((s) => s.token !== token);
  await user.save();

  await AuditLog.create({
    user: req.user._id,
    action: "logout",
    details: `User logged out of current session`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.clearCookie("token");

  res.status(200).json({ success: true, message: "Logged out from current session" });
});

// Forget password
exports.forgetPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new ErrorHandler("No user found with this email", 404));

  const resetToken = user.getResetToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `https://localhost:3000/password/reset/${resetToken}`;
  const message = `Forgot your password? Click the link below : \n\n ${resetPasswordUrl} \n\n This link will expire in 15 minutes `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 15 minutes)",
      message,
    });

    await AuditLog.create({
      user: user._id,
      action: "forgot-password",
      details: `Password reset email sent`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({ status: "success", message: `Token email sent to ${user.email}` });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordTime = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler(err.message, 500));
  }
});

// Reset password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;

  console.log("🔑 Incoming raw token:", token);

  // Hash incoming token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  console.log("🧪 Hashed token:", resetPasswordToken);

  // Find user with this hashed token and check token expiration
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+password passwordHistory isLocked loginAttempts");

  if (!user) {
    console.log("❌ No user found with this token or token expired.");

    // Extra: Try to find user ignoring expiration to debug
    const userIgnoreExpiry = await User.findOne({ resetPasswordToken });
    if (userIgnoreExpiry) {
      console.log("⚠️ User found but token expired:", userIgnoreExpiry.email, "Token expiry:", userIgnoreExpiry.resetPasswordTime);
    } else {
      console.log("⚠️ No user found with this token at all.");
    }

    return next(new ErrorHandler("Invalid or expired reset token", 400));
  }

  console.log("✅ User found:", user.email);

  const { password, passwordConfirm } = req.body;
  console.log("📦 Received passwords:", { password, passwordConfirm });

  if (!password || !passwordConfirm) {
    return next(new ErrorHandler("Both password fields are required", 400));
  }

  if (password !== passwordConfirm) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  if (!isStrongPassword(password)) {
    return next(
      new ErrorHandler(
        "Password must be 8-100 characters long and include uppercase, lowercase, number, and special character.",
        400
      )
    );
  }

  // Check last 5 passwords to prevent reuse
  const reused = await Promise.any(
    (user.passwordHistory || []).slice(-5).map((oldHash) =>
      bcrypt.compare(password, oldHash)
    )
  ).catch(() => false);

  if (reused === true) {
    return next(new ErrorHandler("You cannot reuse your last 5 passwords", 400));
  }

  user.passwordHistory = user.passwordHistory || [];

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordTime = undefined;
  user.isLocked = false;
  user.loginAttempts = 0;

  await user.save();

  console.log("🔐 Password updated successfully");

  await AuditLog.create({
    user: user._id,
    action: "reset-password",
    details: "User successfully reset password",
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  sendToken(user, 200, res);
});






exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  // Find user with password and passwordHistory selected
  const user = await User.findById(req.user.id).select("+password +passwordHistory");
  if (!user) {
    return next(new ErrorHandler("Password update only allowed via OTP flow", 403));

  }

  const { oldPassword, newPassword, passwordConfirm } = req.body;

  // Check if old password matches
  const isPasswordMatched = await user.comparePassword(oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Old password is incorrect", 400));
  }

  // Check password confirmation
  if (newPassword !== passwordConfirm) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  // Validate new password strength
  if (!isStrongPassword(newPassword)) {
    return next(
      new ErrorHandler(
        "Password must be 8-100 characters long and include uppercase, lowercase, number, and special character.",
        400
      )
    );
  }

  // Check if new password is same as current password
  const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
  if (isSameAsCurrent) {
    return next(
      new ErrorHandler("You cannot reuse your current password. Please choose a new one.", 400)
    );
  }

  // Check if new password matches any of last 5 passwords
  const isReused = await Promise.all(
    (user.passwordHistory || []).map(async (oldHashedPassword) => {
      return await bcrypt.compare(newPassword, oldHashedPassword);
    })
  );

  if (isReused.includes(true)) {
    return next(
      new ErrorHandler("You cannot reuse any of your last 5 passwords. Please choose a new one.", 400)
    );
  }

  // Set the new password (triggers pre-save hashing & history update in user model)
  user.password = newPassword;
  await user.save();

  // Create audit log entry
  await AuditLog.create({
    user: req.user._id,
    action: "update-password",
    details: `Password updated by user`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Send new token and success response
  sendToken(user, 200, res);
});






// Update user profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, email, avatar } = req.body;
  const newUserData = { name, email };

  if (avatar) {
    const isValid = await validateBase64Image(avatar);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or unsupported image type.' });
    }

    const user = await User.findById(req.user.id);
    if (user.avatar.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    const result = await cloudinary.uploader.upload(avatar, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });

    newUserData.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }


  const updatedUser = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  await AuditLog.create({
    user: req.user._id,
    action: "update-profile",
    details: `User profile updated`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, user: updatedUser });
});

// Get all users (Admin)
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({ success: true, users });
});

// Get single user (Admin)
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found with this ID", 400));
  res.status(200).json({ success: true, user });
});

// Update user role (Admin)
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
  const { name, email, role } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { name, email, role }, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  await AuditLog.create({
    user: req.user._id,
    action: "admin-update-role",
    details: `Changed user ${user._id}'s role to ${role}`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, user });
});



// Delete user (Admin)
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found with this ID", 400));

  if (user.avatar.public_id) {
    await cloudinary.uploader.destroy(user.avatar.public_id);
  }

  await user.remove();

  await AuditLog.create({
    user: req.user._id,
    action: "admin-delete-user",
    details: `Deleted user with ID: ${req.params.id}`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, message: "User deleted successfully" });
});



// Get user details
exports.userDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, user });
});



// passwordController
exports.checkPasswordReuse = async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select("passwordHistory");

  for (let oldHashed of user.passwordHistory) {
    const isUsed = await bcrypt.compare(password, oldHashed);
    if (isUsed) {
      return res.json({ reused: true });
    }
  }

  return res.json({ reused: false });
};







// Add product to favorites
exports.addToFavorites = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const productId = req.params.id;

  if (!user.favorites.includes(productId)) {
    user.favorites.push(productId);
    await user.save();
  }

  res.status(200).json({ success: true, favorites: user.favorites });
});

// Remove product from favorites
exports.removeFromFavorites = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const productId = req.params.id;

  user.favorites = user.favorites.filter(
    (fav) => fav.toString() !== productId.toString()
  );
  await user.save();

  res.status(200).json({ success: true, favorites: user.favorites });
});

// Add product to cart or increase quantity if already exists
exports.addToCart = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const productId = req.params.id;

  const cartItem = user.cart.find(
    (item) => item.product.toString() === productId.toString()
  );

  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    user.cart.push({ product: productId, quantity: 1 });
  }
  await user.save();

  res.status(200).json({ success: true, cart: user.cart });
});

// Update cart item quantity
exports.updateCartItem = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const productId = req.params.id;
  const { quantity } = req.body;

  const cartItem = user.cart.find(
    (item) => item.product.toString() === productId.toString()
  );
  if (!cartItem) {
    return next(new ErrorHandler("Product not found in cart", 404));
  }

  if (quantity < 1) {
    return next(new ErrorHandler("Quantity must be at least 1", 400));
  }

  cartItem.quantity = quantity;
  await user.save();

  res.status(200).json({ success: true, cart: user.cart });
});

// Remove product from cart
exports.removeFromCart = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const productId = req.params.id;

  user.cart = user.cart.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  await user.save();

  res.status(200).json({ success: true, cart: user.cart });
});

// Buy products (checkout)
exports.buyProducts = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("cart.product");

  if (!user.cart.length) {
    return next(new ErrorHandler("Cart is empty", 400));
  }

  // Check stock and update product stock
  for (const item of user.cart) {
    if (item.quantity > item.product.stock) {
      return next(
        new ErrorHandler(
          `Product ${item.product.name} is out of stock or insufficient quantity`,
          400
        )
      );
    }
  }

  for (const item of user.cart) {
    item.product.stock -= item.quantity;
    await item.product.save();
  }

  // Clear user cart
  user.cart = [];
  await user.save();

  res.status(200).json({ success: true, message: "Purchase successful" });
});

