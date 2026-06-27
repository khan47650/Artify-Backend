const mongoose = require("mongoose");

const artworkSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    medium: { type: String, default: "" },
    subject: { type: String, default: "" },
    style: { type: String, default: "" },
    size: { type: String, default: "" },
    orientation: { type: String, default: "" },
    availability: { type: String, default: "" },
    color: { type: String, default: "" },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },

    approvedStatus: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },

    sellingStatus: {
      type: String,
      enum: ["pending", "sold"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Artwork", artworkSchema);