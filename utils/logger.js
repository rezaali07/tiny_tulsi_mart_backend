const winston = require("winston");
require("winston-mongodb");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.MongoDB({
      db: process.env.DB_URL,
      collection: "logs",
      tryReconnect: true,
      options: { useUnifiedTopology: true },
      capped: true,
      expireAfterSeconds: 60 * 60 * 24 * 30, 
    }),
  ],
});

module.exports = logger;
