const express = require("express");
const {
  createUser,
  
} = require("../controller/UserController");

const {
  sendOtpToEmail,
 


router.route("/me/sessions").get(isAuthenticatedUser, getUserSessions);
router.route("/sessions/:token").delete(isAuthenticatedUser, logoutSessionByToken);
router.route("/logout-all").post(isAuthenticatedUser, logoutAllSessions);
router.get("/me/current-token", isAuthenticatedUser, getCurrentToken);

// OTP routes for registration and login
router.post("/send-otp", sendOtpToEmail);
router.post("/verify-otp-register", verifyOtpAndCreateUser);


router.post("/send-login-otp", sendLoginOtp);
router.post("/login/verify-login-otp", verifyLoginOtp);

// Password update OTP routes
router.post("/password/update/send-otp", isAuthenticatedUser, sendUpdatePasswordOtp);
router.post("/password/update/verify-otp", isAuthenticatedUser, verifyUpdatePasswordOtp);
module.exports = router;
