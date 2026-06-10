const express = require("express");
const {
  getAllSellers,
  updateSellerStatus,
  getSellerArtworks,
  getSellerById,
} = require("../controllers/userController");

const router = express.Router();

router.get("/sellers", getAllSellers);
router.put("/seller-status/:id", updateSellerStatus);
router.get("/seller-artworks/:id", getSellerArtworks);
router.get("/seller/:id", getSellerById);

module.exports = router;