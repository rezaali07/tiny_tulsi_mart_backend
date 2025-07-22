const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const PASSWORD_HISTORY_LIMIT = 5;
const MAX_LOGIN_ATTEMPTS = 5;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Enter your name"],
    maxlength: [50, "Name can't be more than 50 characters"],
    minlength: [3, "Name can't be less than 2 characters"],
  },
  email: {
    type: String,
    required: [true, "Enter your email"],
    unique: true,
    validate: [validator.isEmail, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Please enter password"],
    minlength: [8, "Password must be at least 8 characters"],
    maxlength: [100, "Password must be less than 100 characters"],
    select: false,
  },
  passwordHistory: {
    type: [String],
    default: [],
    select: false,
  },
  avatar: {
    public_id: { type: String, required: true, default: "default_avatar_id" },
    url: { type: String, required: true, default: "https://example.com/default_avatar.png" },
  },
  role: {
    type: String,
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  sessions: {
    type: [
      {
        _id: false,
        token: String,
        ip: String,
        device: String,
        createdAt: { type: Date, default: Date.now },
        lastActive: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    select: false,
  },
  otpExpires: {
    type: Date,
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  trustedDevices: {
    type: [String],
    default: [],
  },

  // === New fields for favorites and cart ===
  favorites: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
    },
  ],

  cart: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
      quantity: {
        type: Number,
        default: 1,
      },
    },
  ],
});

// Virtual for account lock status
userSchema.virtual("isAccountLocked").get(function () {
  return this.isLocked;
});

// Pre-save middleware for password hashing and password history check
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (!this.isNew) {
    const existingUser = await this.constructor.findById(this._id).select("password passwordHistory");

    if (existingUser) {
      const reused = await Promise.any(
        existingUser.passwordHistory.map(async (oldHash) => {
          return await bcrypt.compare(this.password, oldHash);
        })
      ).catch(() => false);

      if (reused) {
        return next(new Error("❌ You cannot reuse your last 5 passwords."));
      }

      const currentPasswordHash = existingUser.password;
      if (currentPasswordHash) {
        this.passwordHistory = existingUser.passwordHistory || [];
        this.passwordHistory.push(currentPasswordHash);
        if (this.passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
          this.passwordHistory = this.passwordHistory.slice(-PASSWORD_HISTORY_LIMIT);
        }
      }
    }
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Compare entered password with stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Generate password reset token
userSchema.methods.getResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

// Increment login attempts and lock account if needed
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    this.isLocked = true;
  }
  await this.save({ validateBeforeSave: false });
};

// Reset login attempts and unlock account
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.isLocked = false;
  await this.save({ validateBeforeSave: false });
};

// Set OTP and expiry for 2FA login
userSchema.methods.setOtp = function (otp) {
  this.otp = otp;
  this.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
  return this.save({ validateBeforeSave: false });
};

// Verify given OTP
userSchema.methods.verifyOtp = function (otp) {
  return this.otp === otp && this.otpExpires > Date.now();
};

// Clear OTP after successful verification
userSchema.methods.clearOtp = function () {
  this.otp = undefined;
  this.otpExpires = undefined;
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model("User", userSchema);
