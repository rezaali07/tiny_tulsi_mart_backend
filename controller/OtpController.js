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
