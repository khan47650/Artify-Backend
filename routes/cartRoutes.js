const express = require("express");
const {
    addToCart,
    getUserCart,
    removeFromCart,
    clearCart,
    updateCartQuantity,
} = require("../controllers/cartController");

const router = express.Router();

router.post("/", addToCart);
router.get("/:userId", getUserCart);
router.delete("/clear/:userId", clearCart);
router.delete("/:id", removeFromCart);
router.put("/:id/quantity", updateCartQuantity);

module.exports = router;