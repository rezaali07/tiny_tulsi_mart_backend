// middleware/auditLogger.js

const winston = require("winston");
require("winston-mongodb");
const dotenv = require("dotenv");

dotenv.config({ path: "./config/.env" });

const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.MongoDB({
      level: "info",
      db: process.env.DB_URL,
      options: { useUnifiedTopology: true },
      collection: "audit_logs",
      tryReconnect: true,
    }),
    new winston.transports.MongoDB({
      level: "error",
      db: process.env.DB_URL,
      options: { useUnifiedTopology: true },
      collection: "error_logs",
      tryReconnect: true,
    }),
  ],
});

const logAudit = (req, res, next) => {
  if (req.user) {
    auditLogger.info("User Action", {
      userId: req.user._id || "Unknown",
      user: req.user.name || "Unknown",
      email: req.user.email || "Unknown",
      method: req.method,
      path: req.originalUrl,
      time: new Date().toISOString(),
    });
  }
  next();
};

const logError = (error, req) => {
  auditLogger.error("Server Error", {
    message: error.message,
    stack: error.stack,
    method: req?.method || "Unknown",
    path: req?.originalUrl || "Unknown",
    // Log email from req.user if authenticated, else from request body if available (e.g., during login)
    userId: req?.user?._id || req.body?.email || "Unauthenticated",
    email: req?.user?.email || req.body?.email || "Unauthenticated",
    time: new Date().toISOString(),
  });
};

module.exports = {
  logAudit,
  logError,
  auditLogger,
};
