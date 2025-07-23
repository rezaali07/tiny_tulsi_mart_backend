const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter name of your product"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Please add description of your product"],
  },
  price: {
    type: Number,
    required: [true, "Add price of product"],
    maxlength: [8, "price cant exceed 8 characters"],
  },
  offerPrice: {
    type: String,
  },
  color: {
    type: String,
  },
  size: {
    type: String,
  },
  ratings: {
    type: Number,
    default: 0,
  },
  images: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  },
      name: {
        type: String,
        required: true,
      },
      rating: {
        type: Number,
        required: true,
      },
      comment: {
        type: String,
      },
      time: {
        type: Date,
        default: Date.now(),
      },
    },
  ],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },

module.exports = mongoose.model("Product", productSchema);
