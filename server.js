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



// unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    console.log("Server shutting down due to unhandled promise rejection");
    server.close(() => process.exit(1));
});

module.exports = server;
