const express = require("express");
const app = express();
const ErrorHandler = require("./middleware/error");
const dotenv = require("dotenv");
const cors = require("cors");
const csrf = require("csurf");
const adminRoutes = require("./routes/AdminRoute");

// Middleware
const auditLogger = require("./middleware/auditLogger");

// Config
dotenv.config({
  path: "backend/config/.env",
});

// Core Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(fileUpload());

app.use(
  cors({
    origin: "https://localhost:3000",
    credentials: true,
  })
);

// Apply other routes (product, order, payment, admin)
app.use("/api/v2", productRoutes);
app.use("/api/v2", orderRoutes);
app.use("/api/v2", paymentRoutes);
app.use("/api/v2", adminRoutes);

// Error handler (should always be last)
app.use(ErrorHandler);

module.exports = app;
