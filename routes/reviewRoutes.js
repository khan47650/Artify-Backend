const express = require("express");

const {
    createReview,
    getArtworkReviews,
} = require("../controllers/reviewController");

const router = express.Router();

router.post("/", createReview);

router.get("/:artworkId", getArtworkReviews);

module.exports = router;