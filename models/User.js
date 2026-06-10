const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["buyer", "seller"],
      default: "buyer",
    },
    firstName: String,
    lastName: String,
    phoneNumber: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    artistPhoto: String,
    introduction: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },

    accountStatus: {
      type: String,
      enum: ["active", "freeze"],
      default: "active",
    },

  },

  { timestamps: true, collection: "Users" }
);

module.exports = mongoose.model("User", userSchema);