const Review = require("../models/Review");

exports.createReview = async (req, res) => {
    try {
        const { artworkId, userId, review } = req.body;

        if (!review) {
            return res.status(400).json({
                message: "Review is required",
            });
        }

        const newReview = await Review.create({
            artworkId,
            userId,
            review,
        });

        res.status(201).json({
            message: "Review added successfully",
            review: newReview,
        });
    } catch (error) {
        res.status(500).json({
            message: "Review create failed",
            error: error.message,
        });
    }
};

exports.getArtworkReviews = async (req, res) => {
    try {
        const { artworkId } = req.params;

        const reviews = await Review.find({ artworkId })
            .populate("userId", "firstName lastName artistPhoto")
            .sort({ createdAt: -1 });

        res.json({ reviews });
    } catch (error) {
        res.status(500).json({
            message: "Reviews fetch failed",
            error: error.message,
        });
    }
};