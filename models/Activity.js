const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    // null means general announcement for all users
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: ["announcement", "artwork_approved", "order", "account", "general"],
      default: "general",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);