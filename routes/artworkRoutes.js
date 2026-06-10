const express = require("express");
const {
  addArtwork,
  getAllArtworks,
  getCurrentUserArtworks,
  updateArtwork,
  deleteArtwork,
  getArtworkStats,
  getPendingArtworks,
  approveArtwork,
  rejectArtwork
} = require("../controllers/artworkController");

const router = express.Router();

router.post("/", addArtwork);
router.get("/", getAllArtworks);
router.get("/user/:userId", getCurrentUserArtworks);
router.get("/stats/:userId", getArtworkStats);
router.put("/:id", updateArtwork);
router.delete("/reject/:id", rejectArtwork);
router.delete("/:id", deleteArtwork);
router.get("/pending", getPendingArtworks);
router.put("/approve/:id", approveArtwork);

module.exports = router;