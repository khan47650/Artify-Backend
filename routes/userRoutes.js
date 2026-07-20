const express = require("express");

const {
  getAllUsers,
  getAllArtists,
  updateUserStatus,
  getUserArtworks,
  getUserById,
} = require("../controllers/userController");

const router = express.Router();

router.get("/users", getAllUsers);
router.get("/artists", getAllArtists);

router.put("/status/:id", updateUserStatus);

router.get("/:id/artworks", getUserArtworks);
router.get("/:id", getUserById);

module.exports = router;