const LikedArtwork = require("../models/LikedArtwork");

exports.toggleLikeArtwork = async (req, res) => {
    try {
        const { userId, artworkId } = req.body;

        const existing = await LikedArtwork.findOne({
            userId,
            artworkId,
        });

        if (existing) {
            await LikedArtwork.findByIdAndDelete(existing._id);

            return res.json({
                liked: false,
                message: "Artwork removed from liked",
            });
        }

        await LikedArtwork.create({
            userId,
            artworkId,
        });

        res.json({
            liked: true,
            message: "Artwork liked successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Like failed",
            error: error.message,
        });
    }
};

exports.getLikedArtworks = async (req, res) => {
    try {
        const { userId } = req.params;

        const liked = await LikedArtwork.find({ userId })
            .populate({
                path: "artworkId",
                populate: {
                    path: "userId",
                    select: "firstName lastName accountStatus",
                },
            })
            .sort({ createdAt: -1 });

        const filtered = liked.filter(
            (item) =>
                item.artworkId &&
                item.artworkId.sellingStatus !== "sold" &&
                item.artworkId.userId?.accountStatus !== "freeze"
        );

        res.json({ liked: filtered });
    } catch (error) {
        res.status(500).json({
            message: "Liked artworks fetch failed",
            error: error.message,
        });
    }
};

exports.removeLikedArtwork = async (req, res) => {
    try {
        const { id } = req.params;

        await LikedArtwork.findByIdAndDelete(id);

        res.json({
            message: "Liked artwork removed",
        });
    } catch (error) {
        res.status(500).json({
            message: "Remove failed",
            error: error.message,
        });
    }
};

exports.clearLikedArtworks = async (req, res) => {
    try {
        const { userId } = req.params;

        await LikedArtwork.deleteMany({ userId });

        res.json({
            message: "All liked artworks removed",
        });
    } catch (error) {
        res.status(500).json({
            message: "Clear liked failed",
            error: error.message,
        });
    }
};