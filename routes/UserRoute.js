const express = require("express");
const {
  createUser,
  loginUser,
  logoutUser,
  forgetPassword,
  resetPassword,
  userDetails,
  updatePassword,
  updateProfile,
  getAllUsers,
  getSingleUser,
  updateUserRole,
  deleteUser,
  getUserSessions,
  logoutSessionByToken,
  logoutAllSessions,
  getCurrentToken,
} = require("../controller/UserController");

const {
  sendOtpToEmail,
  verifyOtpAndCreateUser,
  sendLoginOtp,
  verifyLoginOtp,
  sendUpdatePasswordOtp,
  verifyUpdatePasswordOtp,
} = require("../controller/OtpController");

const {
  isAuthenticatedUser,
  authorizedRoles,
  auth,
} = require("../middleware/auth");

const router = express.Router();

// Traditional user auth routes
router.route("/register").post(createUser);
router.route("/login").post(loginUser);
router.route("/logout").get(isAuthenticatedUser, logoutUser);

router.route("/password/forgot").post(forgetPassword);
router.route("/password/reset/:token").put(resetPassword);

router.route("/me/update").put(isAuthenticatedUser, updatePassword);

router.route("/me/update/profile").put(isAuthenticatedUser, updateProfile);
router.route("/me").get(isAuthenticatedUser, userDetails);

// Optional auth routes
// router.route("/me/updates").put(auth, updatePassword);
// router.route("/me/update/profiles").put(auth, updateProfile);
// router.route("/userdetails").get(auth, userDetails);

// Admin user management routes
router.route("/admin/users").get(isAuthenticatedUser, authorizedRoles("admin"), getAllUsers);
router.route("/admin/user/:id")
  .get(isAuthenticatedUser, authorizedRoles("admin"), getSingleUser)
  .put(isAuthenticatedUser, authorizedRoles("admin"), updateUserRole)
  .delete(isAuthenticatedUser, authorizedRoles("admin"), deleteUser);

// Session management
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
