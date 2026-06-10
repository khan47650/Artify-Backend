const mongoose = require("mongoose");

const likedArtworkSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        artworkId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Artwork",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("LikedArtwork", likedArtworkSchema);