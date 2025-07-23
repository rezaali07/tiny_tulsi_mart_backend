const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  //wrong mongoose id
  if (err.name === "CastError") {
    const message = `Invalid mongo Id:  Resource not found with id ${err.value}`;
    err = new ErrorHandler(message, 400);
  }


  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    status: err.status,
  });
};



