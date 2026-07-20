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

router.get(
    "/pending/:userId",
    getUserPendingOrders
);

router.get(
    "/confirmed/:userId",
    getUserConfirmedOrders
);

router.get(
    "/history/:userId/:filter",
    getBuyerOrdersHistory
);

router.put(
    "/history/clear/:id",
    clearBuyerOrderHistory
);

router.get(
    "/sales/:sellerId",
    getSellerSalesHistory
);

router.delete("/:id", cancelOrder);

module.exports = router;