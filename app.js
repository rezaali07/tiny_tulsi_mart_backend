const express = require("express");
const helmet = require("helmet"); // <-- Security headers
const app = express();
const cookieParser = require("cookie-parser");
const cloudinary = require("cloudinary");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const csrf = require("csurf");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

// Load env vars
dotenv.config({ path: "backend/config/.env" });

// Middleware
const ErrorHandler = require("./middleware/error");
const { logAudit, logError } = require("./middleware/auditLogger");

// Routes
const userRoutes = require("./routes/UserRoute");
const productRoutes = require("./routes/ProductRoute");
const orderRoutes = require("./routes/OrderRoute");
const paymentRoutes = require("./routes/PaymentRoute");
const adminRoutes = require("./routes/AdminRoute");

// Allowed origins whitelist (add all frontend origins here)
const allowedOrigins = [
  "https://localhost:3000/",
  "http://localhost:3000/",
  "https://localhost:4000/",
  "http://localhost:4000/",
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : [])
];

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://localhost:3000"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://localhost:3000"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
  })
);

// Core Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(fileUpload());

// XSS Protection
app.use(xss());

// Sanitize against NoSQL injection
app.use(
  mongoSanitize({
    onSanitize: ({ req, key }) => {
      console.warn(
        ` [mongoSanitize] Detected and removed key: "${key}" from request at ${req.originalUrl}`
      );
    },
  })
);

// CORS with whitelist
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman, curl, etc.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log(`❌ Blocked by CORS: ${origin}`);
        return callback(new Error(`CORS policy does not allow origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Global Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({ message: options.message });
  },
});
app.use(limiter);

// CSRF Token Route
app.get("/api/v2/csrf-token", csrf({ cookie: true }), (req, res) => {
  const token = req.csrfToken();
  res.cookie("XSRF-TOKEN", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
  res.status(200).json({ csrfToken: token });
});

// Health Check
app.get("/health", (req, res) => {
  res.send("Backend server is running securely over HTTPS");
});

// Unprotected Routes first
app.use("/api/v2", userRoutes);

// CSRF Middleware for protected routes
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  },
});
app.use("/api/v2", csrfProtection);

// Audit Logger for user actions (must be after user auth middleware)
app.use(logAudit);

// Protected Routes
app.use("/api/v2", productRoutes);
app.use("/api/v2", orderRoutes);
app.use("/api/v2", paymentRoutes);
app.use("/api/v2", adminRoutes);

// Error logging middleware (logs error details before final error handler)
app.use((err, req, res, next) => {
  logError(err, req); // Log errors with user info if available
  next(err);
});

// Final error handler (returns error response)
app.use(ErrorHandler);

module.exports = app;
