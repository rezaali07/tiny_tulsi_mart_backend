const ErrorHandler = require("../utils/ErrorHandler");

const catchAsyncErrors = require("./catchAsyncErrors");

const jwt = require("jsonwebtoken");

const User = require("../models/UserModel");



// exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
//   const { token } = req.cookies;
//   if (!token) {
//     return next(new ErrorHandler("Please login to continue", 401));
//   }

//   const decodedData = jwt.verify(token, process.env.JWT_SECRET);
//   const user = await User.findById(decodedData.id);

//   if (!user) return next(new ErrorHandler("User not found", 401));

//   const session = user.sessions.find((s) => s.token === token);
//   if (!session) {
//     return next(new ErrorHandler("Session invalid or expired", 401));
//   }

//   session.lastActive = new Date();
//   await user.save();

//   req.user = user;
//   next();
// });

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decodedData.id);

  if (!user) return next(new ErrorHandler("User not found", 401));

  const session = user.sessions.find((s) => s.token === token);
  if (!session) {
    return next(new ErrorHandler("Session invalid or expired", 401));
  }

  // Check for 15 minutes of inactivity
  const now = Date.now();
  const lastActive = new Date(session.lastActive).getTime();
  if (now - lastActive > 15 * 60 * 1000) {
    // Remove expired session
    user.sessions = user.sessions.filter((s) => s.token !== token);
    await user.save();
    return next(new ErrorHandler("Session expired due to inactivity", 401));
  }


  session.lastActive = new Date();
  await user.save();

  req.user = user;
  next();
});



// admin roles here 
exports.authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(`${req.user.role} are not authorized to perform this action`, 403)
      );
    };
    next();
  }
}

exports.auth = async (req, res, next) => {
  // check header

  console.log("---------------------------------------------------");
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return next(new ErrorHandler("Please login to access the data", 400));
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decodedData.id);
    next();
  } catch (error) {
    console.log(error);
    throw next(new ErrorHandler("Please login to access the data", 400));
  }
};
