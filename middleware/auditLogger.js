// middleware/auditLogger.js

const winston = require("winston");
require("winston-mongodb");
const dotenv = require("dotenv");

// Load env vars
dotenv.config({ path: "./config/.env" }); // ✅ correct path for DB_URL

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
  ],
});

const logAudit = (req, res, next) => {
  if (req.user) {
    auditLogger.info("User Action", {
      user: req.user.name || "Unknown",
      email: req.user.email || "Unknown",
      method: req.method,
      path: req.originalUrl,
      time: new Date().toISOString(),
    });
  }
  next();
};

module.exports = logAudit;
