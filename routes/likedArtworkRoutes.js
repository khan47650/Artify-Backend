const express = require("express");

const {
    toggleLikeArtwork,
    getLikedArtworks,
    removeLikedArtwork,
    clearLikedArtworks,
} = require("../controllers/likedArtworkController");

const router = express.Router();

router.post("/toggle", toggleLikeArtwork);

router.get("/:userId", getLikedArtworks);

router.delete("/:id", removeLikedArtwork);

router.delete("/clear/:userId", clearLikedArtworks);

module.exports = router;