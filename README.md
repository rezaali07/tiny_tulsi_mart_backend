# 🌿 Tiny Tulsi Mart – Backend

Tiny Tulsi Mart is a culturally inspired online baby store built with love and care. The backend is powered by Node.js, Express, and MongoDB, providing secure and scalable APIs for products, users, authentication, orders, and more.

---

## 🚀 Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB + Mongoose
* **Authentication:** JWT (JSON Web Token)
* **Cloud:** Cloudinary (for image uploads)
* **Payments:** Stripe integration
* **Security:** Various middlewares (listed below)

---

## 📁 Project Structure

```
/backend
│
├── controllers/
├── models/
├── routes/
├── middleware/
├── utils/
├── config/
└── server.js

```

---

## ⚙️ Features

* 🛙️ Product Management (Add, Edit, Delete, View)
* 👶 Baby-focused Catalog with Cultural Context
* 👤 User Authentication (Signup/Login with JWT)
* 💳 Secure eSewa Payment Integration
* ⭐ Wishlist and Favorites
* 📦 Order History Tracking
* 📩 Admin Notifications
* 🔒 Multi-session Trusted Device Tracking
* 📊 Admin Dashboard & Earnings
* 📃 PDF/Image Upload for Exam Routines (if academic features exist)

---

## 🔐 Security Features

We’ve implemented strong protection to ensure privacy and secure operation across all API routes:

### 🔑 JWT Authentication

Secure session management using JWTs stored in **HTTP-only cookies**, preventing XSS access to the token.

### 📱 Trusted Device Tracking

When a user logs in from a trusted device, we log the session with metadata including:

* Token
* IP Address
* Device Type
* Login Time

This helps detect suspicious activity and manage active sessions.

### 🌐 CORS Protection

Strict Cross-Origin Resource Sharing policies allow only **trusted frontend domains** to access the backend. Unauthorized origins are blocked to prevent CSRF and spoofing attempts.

### 🧜‍♂️ XSS Prevention

Input is sanitized using `xss-clean` middleware to remove malicious scripts, preventing cross-site scripting attacks.

### 🔐 HPP (HTTP Parameter Pollution) Protection

The `hpp` middleware ensures query parameters cannot be tampered with or overloaded via repeated keys.

### ❌ Rate Limiting

Rate limiting middleware prevents abuse by restricting excessive requests from a single IP, guarding against brute-force and DoS attacks.

### 🔐 Helmet

Adds various HTTP headers to secure the app (e.g., `Content-Security-Policy`, `X-Frame-Options`).

---

## 🥪 Testing

You can test routes using:

* ✅ Postman
* ✅ Curl
* ✅ Frontend integration (CORS-safe)

---

## 📦 Setup & Installation

```bash
# 1. Clone repository
git clone https://github.com/rezaali07/tiny_tulsi_mart_backend.git

# 2. Navigate to folder
cd tiny-tulsi-mart-backend

# 3. Install dependencies
npm install

# 4. Create `.env` file and set required keys

# 5. Start the server
npm start


## 💡 Inspiration

> Tiny Tulsi Mart is rooted in cultural values, ensuring that every product aligns with traditional wellness while embracing modern quality.

📫 Contact
✉️ Email: rezaali20ab@gmail.com
Git: rezaali07
