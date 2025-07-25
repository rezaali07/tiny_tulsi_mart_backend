const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // prevent multiple entries for same email
  },
  otp: {
    type: String,
    required: true,
  },
 
});


module.exports = mongoose.model("Otp", otpSchema);
