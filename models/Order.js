const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        buyerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        artworks: [
            {
                artworkId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Artwork",
                    required: true,
                },
                sellerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },

                quantity: {
                    type: Number,
                    required: true,
                    default: 1,
                    min: 1,
                },
            },
        ],

        location: {
            type: String,
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: ["easypaisa", "jazzcash"],
            required: true,
        },

        paymentReceipt: {
            type: String,
            required: true,
        },

        orderStatus: {
            type: String,
            enum: ["pending", "confirmed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);