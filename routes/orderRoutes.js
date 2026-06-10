const express = require("express");
const {
    placeOrder,
    getAllOrders,
    confirmOrder,
    getUserPendingOrders,
    cancelOrder,
    getUserConfirmedOrders,
    getBuyerOrdersHistory,
    clearBuyerOrderHistory,
    getSellerSalesHistory,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/", placeOrder);
router.get("/", getAllOrders);
router.put("/confirm/:id", confirmOrder);
router.get("/pending/:userId/:role", getUserPendingOrders);
router.delete("/:id", cancelOrder);
router.get("/confirmed/:userId/:role", getUserConfirmedOrders);
router.get("/history/:userId/:filter", getBuyerOrdersHistory);
router.put("/history/clear/:id", clearBuyerOrderHistory);
router.get("/sales/:sellerId", getSellerSalesHistory);

module.exports = router;