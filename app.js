// const express = require("express");
// const app = express();
// const cookieParser = require("cookie-parser");
// const cloudinary = require("cloudinary");
// const fileUpload = require("express-fileupload");
// const bodyParser = require("body-parser");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const csrf = require("csurf");
// const mongoSanitize = require("express-mongo-sanitize");

// // Load env vars
// dotenv.config({ path: "backend/config/.env" });

// // Middleware
// const ErrorHandler = require("./middleware/error");
// const auditLogger = require("./middleware/auditLogger");

// // Routes
// const userRoutes = require("./routes/UserRoute");
// const productRoutes = require("./routes/ProductRoute");
// const orderRoutes = require("./routes/OrderRoute");
// const paymentRoutes = require("./routes/PaymentRoute");
// const adminRoutes = require("./routes/AdminRoute");

// // Allowed origin from .env
// const allowedOrigin = process.env.CORS_ORIGINS || "https://localhost:3000";

// // =============== Core Middleware ===============
// app.use(express.json());
// app.use(cookieParser());
// app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
// app.use(fileUpload());

// //=============== CORS ===============
// app.use(
//   cors({
//     origin: allowedOrigin,
//     credentials: true,
//   })
// );

// // CORS Configuration
// // app.use(
// //   cors({
// //     origin: function (origin, callback) {
// //       if (!origin) {
// //         // Allow requests with no origin (like Postman or curl)
// //         return callback(null, true);
// //       }
// //       if (allowedOrigins.includes(origin)) {
// //         return callback(null, true);
// //       } else {
// //         console.log(`❌ Blocked by CORS: ${origin}`);
// //         return callback(new Error(`CORS policy does not allow origin: ${origin}`));
// //       }
// //     },
// //     credentials: true,
// //   })
// // );

// // =============== CSRF Token Route (no protection) ===============
// app.get("/api/v2/csrf-token", csrf({ cookie: true }), (req, res) => {
//   const token = req.csrfToken();
//   res.cookie("XSRF-TOKEN", token, {
//     httpOnly: false, // JS-accessible
//     secure: true,
//     sameSite: "Lax",
//   });
//   res.status(200).json({ csrfToken: token });
// });

// // =============== Health Check ===============
// app.get("/health", (req, res) => {
//   res.send("Backend server is running securely over HTTPS");
// });

// // =============== Routes & CSRF Protection ===============

// // First, mount routes that do NOT require CSRF (login, register, etc.)
// app.use("/api/v2", userRoutes);

// // Now apply CSRF protection middleware globally for protected routes
// const csrfProtection = csrf({
//   cookie: {
//     httpOnly: true,
//     sameSite: "Lax",
//     secure: true,
//   },
// });
// app.use("/api/v2", csrfProtection);

// // Apply audit logger (after user middleware so req.user is set)
// app.use(auditLogger);

// // Sanitize against NoSQL injection
// app.use(mongoSanitize());

// // Other protected routes
// app.use("/api/v2", productRoutes);
// app.use("/api/v2", orderRoutes);
// app.use("/api/v2", paymentRoutes);
// app.use("/api/v2", adminRoutes);

// // Global error handler
// app.use(ErrorHandler);

// // Export app
// module.exports = app;
const express = require("express");
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

// Load env vars
dotenv.config({ path: "backend/config/.env" });

// Middleware
const ErrorHandler = require("./middleware/error");
const auditLogger = require("./middleware/auditLogger");

// Routes
const userRoutes = require("./routes/UserRoute");
const productRoutes = require("./routes/ProductRoute");
const orderRoutes = require("./routes/OrderRoute");
const paymentRoutes = require("./routes/PaymentRoute");
const adminRoutes = require("./routes/AdminRoute");

// ✅ Allowed origins whitelist (add all frontend origins here)
const allowedOrigins = [
  "https://localhost:3000/",
  "https://localhost:4000/",
  process.env.CORS_ORIGINS
].filter(Boolean); // removes undefined or empty

// =============== Core Middleware ===============
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(fileUpload());

// XSS Protection
app.use(xss());

// ✅ Sanitize against NoSQL injection
app.use(mongoSanitize());

// ✅ CORS with whitelist
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman, etc.
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

// =============== CSRF Token Route (no protection needed here) ===============
app.get("/api/v2/csrf-token", csrf({ cookie: true }), (req, res) => {
  const token = req.csrfToken();
  res.cookie("XSRF-TOKEN", token, {
    httpOnly: false,
    secure: true,
    sameSite: "Lax",
  });
  res.status(200).json({ csrfToken: token });
});

// =============== Health Check ===============
app.get("/health", (req, res) => {
  res.send("Backend server is running securely over HTTPS");
});

// =============== Routes (Unprotected First) ===============
app.use("/api/v2", userRoutes);

// ✅ CSRF Middleware (for protected routes)
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  },
});
app.use("/api/v2", csrfProtection);

// ✅ Audit logger after user login to get req.user
app.use(auditLogger);

// ✅ Protected Routes
app.use("/api/v2", productRoutes);
app.use("/api/v2", orderRoutes);
app.use("/api/v2", paymentRoutes);
app.use("/api/v2", adminRoutes);

// ✅ Error Handler (must be last)
app.use(ErrorHandler);

module.exports = app;
