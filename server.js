const https = require("https");
const fs = require("fs");
const app = require("./app");
const dotenv = require("dotenv");
const connectDatabase = require("./db/Database");
const cloudinary = require("cloudinary");

// handling uncaught exception
process.on("uncaughtException", (err) => {
    console.log("Error Uncaught Exception Occurred: ", err.message);
    console.log("Server shut down for Uncaught Exception Occurred");
    process.exit(1);  // optional: exit after uncaught exception
});

// config
dotenv.config({
    path: "./config/.env",
});

// connect database
connectDatabase();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// SSL mkcert certificate
const sslOptions = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
    requestCert: false,
    rejectUnauthorized: false,
};

// create HTTPS server
const server = https.createServer(sslOptions, app).listen(process.env.PORT, () => {
    console.log(`✅ Secure server is working on https://localhost:${process.env.PORT}`);
});


// unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    console.log("Server shutting down due to unhandled promise rejection");
    server.close(() => process.exit(1));
});

module.exports = server;
