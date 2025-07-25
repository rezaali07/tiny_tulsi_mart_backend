const otpGenerator = require("otp-generator");
const Otp = require("../models/otpModel");
const User = require("../models/UserModel");
const sendMail = require("../utils/sendMail");
const cloudinary = require("cloudinary").v2;
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const bcrypt = require("bcryptjs");
const isStrongPassword = require("../utils/passwordValidator");

// ✅ SEND OTP for Registration
exports.sendOtpToEmail = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new ErrorHandler("User with this email already exists", 400));
  }

  // Delete any previous OTPs for the same email
  await Otp.deleteMany({ email });

  // Generate new 6-digit numeric OTP
  const otp = otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  // Set OTP expiration time (5 minutes from now)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Save OTP to database
  await Otp.create({ email, otp, expiresAt });

  // Prepare email message
  const message = `Your OTP for registration is: ${otp}\nIt is valid for 5 minutes.`;

  // Send OTP email
  await sendMail({
    email,
    subject: "TinyTulsiMart - OTP for Verification",
    message,
  });

  res.status(200).json({
    success: true,
    message: "OTP sent to email successfully",
  });
});

  // Delete all OTPs for this email after successful registration
  await Otp.deleteMany({ email });

  // Generate JWT token for new user
  const token = user.getJwtToken();

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    user,
  });
});

// ========================
// SEND OTP for Login 2FA
exports.sendLoginOtp = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorHandler("User not found with this email", 400));
  }

  // Generate 6-digit OTP
  const otp = otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  // Save OTP and expiry in User document
  user.otp = otp;
  user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
  await user.save({ validateBeforeSave: false });

  // Send OTP email
  const message = `Your OTP for login is: ${otp}\nIt is valid for 5 minutes.`;

  await sendMail({
    email,
    subject: "TinyTulsiMart - Login OTP Verification",
    message,
  });

  res.status(200).json({
    success: true,
    message: "OTP sent to email successfully",
  });
});

// ========================
// VERIFY OTP for Login 2FA
exports.verifyLoginOtp = catchAsyncErrors(async (req, res, next) => {
  const { email, otp, deviceId } = req.body;

  if (!email || !otp || !deviceId) {
    return next(new ErrorHandler("Email, OTP and Device ID are required", 400));
  }

  // Find user with matching email, otp, and not expired
  const user = await User.findOne({
    email,
    otp,
    otpExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired OTP", 400));
  }

  // OTP valid: clear otp fields
  user.otp = undefined;
  user.otpExpires = undefined;

  // Mark user as verified for this login session (optional)
  user.isVerified = true;

  // Add this deviceId to trusted devices if not already there
  if (!user.trustedDevices.includes(deviceId)) {
    user.trustedDevices.push(deviceId);
  }

  // Generate JWT token
  const token = user.getJwtToken();

  // Add session info
  user.sessions.push({
    token,
    ip: req.ip,
    device: req.headers["user-agent"] || "Unknown",
    createdAt: new Date(),
    lastActive: new Date(),
  });

  await user.save({ validateBeforeSave: false });

  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + 15 * 60 * 1000),
  });

  res.status(200).json({
    success: true,
    message: "OTP verified successfully, login complete",
    token,
    user,
  });
});

// // ========================
// // Step 1: Send OTP to user's email before password update
// exports.sendUpdatePasswordOtp = catchAsyncErrors(async (req, res, next) => {
//   const user = await User.findById(req.user.id);
//   if (!user) return next(new ErrorHandler("User not found", 404));

//   const otp = otpGenerator.generate(6, {
//     digits: true,
//     lowerCaseAlphabets: false,
//     upperCaseAlphabets: false,
//     specialChars: false,
//   });

//   user.otp = otp;
//   user.otpExpires = Date.now() + 5 * 60 * 1000; // Valid for 5 mins
//   await user.save({ validateBeforeSave: false });

//   await sendMail({
//     email: user.email,
//     subject: "Update Password - OTP Verification",
//     message: `Your OTP for updating password is: ${otp}\nIt is valid for 5 minutes.`,
//   });

//   res.status(200).json({
//     success: true,
//     message: "OTP sent to your email for password update.",
//   });
// });



// // Step 2: Verify OTP and update password
// exports.verifyUpdatePasswordOtp = catchAsyncErrors(async (req, res, next) => {
//   const { otp, oldPassword, newPassword, passwordConfirm } = req.body;

//   // 1. Validate required fields
//   if (!otp || !oldPassword || !newPassword || !passwordConfirm) {
//     return next(new ErrorHandler("All fields are required", 400));
//   }

//   // 2. Fetch user with OTP, password, history
//   const user = await User.findById(req.user.id).select("+otp +otpExpires +password +passwordHistory");
//   if (!user) {
//     return next(new ErrorHandler("User not found", 404));
//   }

//   // 3. Verify OTP
//   if (user.otp !== otp || user.otpExpires < Date.now()) {
//     return next(new ErrorHandler("Invalid or expired OTP", 400));
//   }

//   // 4. Verify old password
//   const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
//   if (!isOldPasswordValid) {
//     return next(new ErrorHandler("Old password is incorrect", 400));
//   }

//   // 5. Match confirmation password
//   if (newPassword !== passwordConfirm) {
//     return next(new ErrorHandler("Passwords do not match", 400));
//   }

//   // 6. Check strength
//   if (!isStrongPassword(newPassword)) {
//     return next(new ErrorHandler("Password is not strong enough", 400));
//   }

//   // 7. Prevent reuse of old passwords
//   const reused = await Promise.all(
//     (user.passwordHistory || []).map((oldHash) => bcrypt.compare(newPassword, oldHash))
//   );
//   if (reused.includes(true)) {
//     return next(new ErrorHandler("You cannot reuse an old password", 400));
//   }

//   // 8. Update password and clear OTP
//   user.password = newPassword;
//   user.otp = undefined;
//   user.otpExpires = undefined;

//   // Save password history (latest 5)
//   user.passwordHistory = [
//     user.password,
//     ...(user.passwordHistory || []).slice(0, 4),
//   ];

//   await user.save();

//   return res.status(200).json({
//     success: true,
//     message: "Password updated successfully",
//   });
// });



// ========================
// Step 1: Send OTP to user's email before password update
exports.sendUpdatePasswordOtp = catchAsyncErrors(async (req, res, next) => {
  console.log("sendUpdatePasswordOtp called");

  const user = await User.findById(req.user.id);
  if (!user) {
    console.log("User not found in sendUpdatePasswordOtp");
    return next(new ErrorHandler("User not found", 404));
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  console.log(`Generated OTP: ${otp}`);

  user.otp = otp;
  user.otpExpires = Date.now() + 5 * 60 * 1000; // Valid for 5 mins
  await user.save({ validateBeforeSave: false });
  console.log("OTP and expiration saved to user");

  await sendMail({
    email: user.email,
    subject: "Update Password - OTP Verification",
    message: `Your OTP for updating password is: ${otp}\nIt is valid for 5 minutes.`,
  });
  console.log("OTP email sent");

  res.status(200).json({
    success: true,
    message: "OTP sent to your email for password update.",
  });
  console.log("Response sent: OTP sent to your email for password update");
});

// Step 2: Verify OTP and update password
exports.verifyUpdatePasswordOtp = catchAsyncErrors(async (req, res, next) => {
  console.log("verifyUpdatePasswordOtp called with body:", req.body);

  const { otp, oldPassword, newPassword, passwordConfirm } = req.body;

 
  if (!otp || !oldPassword || !newPassword || !passwordConfirm) {
    console.log("Validation failed: missing fields");
    return next(new ErrorHandler("All fields are required", 400));
  }

  
  const user = await User.findById(req.user.id).select("+otp +otpExpires +password +passwordHistory");
  if (!user) {
    console.log("User not found in verifyUpdatePasswordOtp");
    return next(new ErrorHandler("User not found", 404));
  }

 
  if (user.otp !== otp || user.otpExpires < Date.now()) {
    console.log(`Invalid or expired OTP. User OTP: ${user.otp}, Provided OTP: ${otp}, Expires at: ${user.otpExpires}, Now: ${Date.now()}`);
    return next(new ErrorHandler("Invalid or expired OTP", 400));
  }

  // Verify old password
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    console.log("Old password verification failed");
    return next(new ErrorHandler("Old password is incorrect", 400));
  }

  //Match confirmation password
  if (newPassword !== passwordConfirm) {
    console.log("New password and confirmation do not match");
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  // check strength
  if (!isStrongPassword(newPassword)) {
    console.log("New password is not strong enough");
    return next(new ErrorHandler("Password is not strong enough", 400));
  }

  // Prevent reuse of old passwords
  const reused = await Promise.all(
    (user.passwordHistory || []).map((oldHash) => bcrypt.compare(newPassword, oldHash))
  );
  if (reused.includes(true)) {
    console.log("New password matches one of the old passwords");
    return next(new ErrorHandler("You cannot reuse an old password", 400));
  }

  //Update password and clear OTP
  user.password = newPassword;
  user.otp = undefined;
  user.otpExpires = undefined;

  // Save password history (latest 5)
  user.passwordHistory = [
    user.password,
    ...(user.passwordHistory || []).slice(0, 4),
  ];

  await user.save();
  console.log("Password updated and saved, OTP cleared");

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});
