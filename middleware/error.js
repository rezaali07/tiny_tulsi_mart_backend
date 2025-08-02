const ErrorHandler = require("../utils/ErrorHandler");
const { logError } = require("./auditLogger");  

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log the error with user info (if any)
  logError(err, req);

  // Handle specific known errors
  if (err.name === "CastError") {
    const message = `Invalid mongo Id: Resource not found with id ${err.value}`;
    err = new ErrorHandler(message, 400);
  }

  if (err.code === 11000) {
    const message = `Duplicate value: ${Object.keys(err.keyValue)} Entered`;
    err = new ErrorHandler(message, 400);
  }

  if (err.name === "JsonWebTokenError") {
    const message = `Invalid url so please try again: ${err.message}`;
    err = new ErrorHandler(message, 400);
  }

  if (err.name === "TokenExpiredError") {
    const message = `Token url Expired: ${err.message}`;
    err = new ErrorHandler(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    status: err.status,
  });
};
