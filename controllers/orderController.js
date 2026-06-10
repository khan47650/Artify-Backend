const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Artwork = require("../models/Artwork");
const Activity = require("../models/Activity");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("../utils/cloudinary");

exports.placeOrder = async (req, res) => {
    try {
        const { buyerId, location, paymentMethod, paymentReceipt } = req.body;

        if (!buyerId || !location || !paymentMethod || !paymentReceipt) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const buyer = await User.findById(buyerId);

        const cartItems = await Cart.find({ userId: buyerId }).populate({
            path: "artworkId",
            populate: {
                path: "userId",
                select: "firstName lastName email accountStatus",
            },
        });

        if (cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const validItems = cartItems.filter((item) => {
            const art = item.artworkId;
            const qty = Number(item.quantity || 1);

            return (
                art &&
                art.approvedStatus === "approved" &&
                art.sellingStatus !== "sold" &&
                art.userId?.accountStatus !== "freeze" &&
                Number(art.quantity || 0) >= qty
            );
        });

        if (validItems.length === 0) {
            return res.status(400).json({ message: "No valid artworks found in cart" });
        }

        const uploaded = await cloudinary.uploader.upload(paymentReceipt, {
            folder: "artify-payment-receipts",
        });

        const orderArtworks = validItems.map((item) => ({
            artworkId: item.artworkId._id,
            sellerId: item.artworkId.userId._id,
            quantity: Number(item.quantity || 1),
        }));

        const order = await Order.create({
            buyerId,
            artworks: orderArtworks,
            location,
            paymentMethod,
            paymentReceipt: uploaded.secure_url,
        });

        const artworkNames = validItems.map((item) => item.artworkId.name).join(", ");

        await Activity.create({
            title: "Order Placed",
            description: `You placed an order for ${validItems.length} artwork(s): ${artworkNames}.`,
            userId: buyerId,
            type: "general",
        });

        const sellerGroups = {};

        validItems.forEach((item) => {
            const sellerId = String(item.artworkId.userId._id);

            if (!sellerGroups[sellerId]) {
                sellerGroups[sellerId] = {
                    seller: item.artworkId.userId,
                    artworks: [],
                };
            }

            sellerGroups[sellerId].artworks.push(item.artworkId.name);
        });

        for (const sellerId of Object.keys(sellerGroups)) {
            const sellerData = sellerGroups[sellerId];
            const sellerArtworkNames = sellerData.artworks.join(", ");

            await Activity.create({
                title: "New Artwork Order",
                description: `Your artwork(s) received a new order: ${sellerArtworkNames}.`,
                userId: sellerId,
                type: "general",
            });

            if (sellerData.seller?.email) {
                await sendEmail(
                    sellerData.seller.email,
                    "New Artwork Order Received",
                    `
          <div style="font-family:sans-serif;">
            <h2>New Artwork Order</h2>
            <p>Your artwork(s) received a new order:</p>
            <p><b>${sellerArtworkNames}</b></p>
            <p>Please wait for admin confirmation.</p>
            <br />
            <p>Artify Marketplace</p>
          </div>
          `
                );
            }
        }

        if (buyer?.email) {
            await sendEmail(
                buyer.email,
                "Artify Order Placed",
                `
        <div style="font-family:sans-serif;">
          <h2>Order Placed Successfully</h2>
          <p>Your order has been placed for:</p>
          <p><b>${artworkNames}</b></p>
          <p>Payment Method: <b>${paymentMethod}</b></p>
          <p>Our admin team will review and confirm your order shortly.</p>
          <br />
          <p>Thank you for using Artify.</p>
        </div>
        `
            );
        }

        await Cart.deleteMany({ userId: buyerId });

        res.status(201).json({
            message: "Order placed successfully",
            order,
        });
    } catch (error) {
        res.status(500).json({
            message: "Order place failed",
            error: error.message,
        });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("buyerId", "firstName lastName email phoneNumber")
            .populate("artworks.sellerId", "firstName lastName email")
            .populate("artworks.artworkId", "name image price category sellingStatus,quantity")
            .sort({ createdAt: -1 });

        res.json({ orders });
    } catch (error) {
        res.status(500).json({
            message: "Orders fetch failed",
            error: error.message,
        });
    }
};

exports.confirmOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findByIdAndUpdate(
            id,
            { orderStatus: "confirmed" },
            { returnDocument: "after" }
        )
            .populate("buyerId", "firstName lastName email")
            .populate("artworks.sellerId", "firstName lastName email")
            .populate("artworks.artworkId", "name");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const artworkNames = order.artworks
            .map((item) => item.artworkId?.name)
            .filter(Boolean)
            .join(", ");
        for (const item of order.artworks) {
            const artwork = await Artwork.findById(item.artworkId._id);

            if (!artwork) continue;

            const orderedQty = Number(item.quantity || 1);
            const currentQty = Number(artwork.quantity || 0);
            const newQty = Math.max(currentQty - orderedQty, 0);

            artwork.quantity = newQty;
            artwork.sellingStatus = newQty <= 0 ? "sold" : "pending";

            await artwork.save();
        }

        await Activity.create({
            title: "Order Confirmed",
            description: `Your order has been confirmed for: ${artworkNames}.`,
            userId: order.buyerId._id,
            type: "general",
        });

        if (order.buyerId?.email) {
            await sendEmail(
                order.buyerId.email,
                "Artify Order Confirmed",
                `
        <div style="font-family:sans-serif;">
          <h2>Your Order Has Been Confirmed</h2>
          <p>Your order has been confirmed for:</p>
          <p><b>${artworkNames}</b></p>
          <br />
          <p>Thank you for shopping with Artify.</p>
        </div>
        `
            );
        }

        const sellerGroups = {};

        order.artworks.forEach((item) => {
            const sellerId = String(item.sellerId._id);

            if (!sellerGroups[sellerId]) {
                sellerGroups[sellerId] = {
                    seller: item.sellerId,
                    artworks: [],
                };
            }

            sellerGroups[sellerId].artworks.push(item.artworkId.name);
        });

        for (const sellerId of Object.keys(sellerGroups)) {
            const sellerData = sellerGroups[sellerId];
            const names = sellerData.artworks.join(", ");

            await Activity.create({
                title: "Artwork Sold",
                description: `Your artwork(s) have been sold: ${names}.`,
                userId: sellerId,
                type: "general",
            });

            if (sellerData.seller?.email) {
                await sendEmail(
                    sellerData.seller.email,
                    "Artwork Sold Successfully",
                    `
          <div style="font-family:sans-serif;">
            <h2>Artwork Sold</h2>
            <p>Your artwork(s) have been confirmed as sold:</p>
            <p><b>${names}</b></p>
            <br />
            <p>Artify Marketplace</p>
          </div>
          `
                );
            }
        }

        res.json({
            message: "Order confirmed successfully",
            order,
        });
    } catch (error) {
        res.status(500).json({
            message: "Order confirm failed",
            error: error.message,
        });
    }
};

exports.getUserPendingOrders = async (req, res) => {
    try {
        const { userId, role } = req.params;

        let query = {
            orderStatus: "pending",
        };

        if (role === "buyer") {
            query.buyerId = userId;
        }

        if (role === "seller") {
            query["artworks.sellerId"] = userId;
        }

        const orders = await Order.find(query)
            .populate("buyerId", "firstName lastName email")
            .populate("artworks.sellerId", "firstName lastName email")
            .populate("artworks.artworkId", "name image price category,quantity")
            .sort({ createdAt: -1 });

        res.json({ orders });
    } catch (error) {
        res.status(500).json({
            message: "Pending orders fetch failed",
            error: error.message,
        });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id)
            .populate("buyerId", "firstName lastName email")
            .populate("artworks.sellerId", "firstName lastName email")
            .populate("artworks.artworkId", "name");

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        const artworkNames = order.artworks
            .map((item) => item.artworkId?.name)
            .filter(Boolean)
            .join(", ");

        for (const item of order.artworks) {
            await Artwork.findByIdAndUpdate(item.artworkId._id, {
                sellingStatus: "pending",
            });
        }

        await Activity.create({
            title: "Order Cancelled",
            description: `Your order has been cancelled for: ${artworkNames}.`,
            userId: order.buyerId._id,
            type: "general",
        });

        if (order.buyerId?.email) {
            await sendEmail(
                order.buyerId.email,
                "Artify Order Cancelled",
                `
        <div style="font-family:sans-serif;">
          <h2>Order Cancelled</h2>
          <p>Your order has been cancelled for:</p>
          <p><b>${artworkNames}</b></p>
          <p>If payment was already processed, please contact support.</p>
          <br />
          <p>Artify Marketplace</p>
        </div>
        `
            );
        }

        const sellerGroups = {};

        order.artworks.forEach((item) => {
            const sellerId = String(item.sellerId._id);

            if (!sellerGroups[sellerId]) {
                sellerGroups[sellerId] = {
                    seller: item.sellerId,
                    artworks: [],
                };
            }

            sellerGroups[sellerId].artworks.push(item.artworkId.name);
        });

        for (const sellerId of Object.keys(sellerGroups)) {
            const sellerData = sellerGroups[sellerId];
            const names = sellerData.artworks.join(", ");

            await Activity.create({
                title: "Order Cancelled",
                description: `Order for your artwork(s) has been cancelled: ${names}.`,
                userId: sellerId,
                type: "general",
            });

            if (sellerData.seller?.email) {
                await sendEmail(
                    sellerData.seller.email,
                    "Artwork Order Cancelled",
                    `
          <div style="font-family:sans-serif;">
            <h2>Order Cancelled</h2>
            <p>The order for your artwork(s) has been cancelled:</p>
            <p><b>${names}</b></p>
            <br />
            <p>Artify Marketplace</p>
          </div>
          `
                );
            }
        }

        await Order.findByIdAndDelete(id);

        res.json({
            message: "Order cancelled successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Order cancel failed",
            error: error.message,
        });
    }
};

exports.getUserConfirmedOrders = async (req, res) => {
    try {
        const { userId, role } = req.params;

        const query = { orderStatus: "confirmed" };

        if (role === "buyer") {
            query.buyerId = userId;
        }

        if (role === "seller") {
            query["artworks.sellerId"] = userId;
        }

        const orders = await Order.find(query)
            .populate("buyerId", "firstName lastName email")
            .populate("artworks.sellerId", "firstName lastName email")
            .populate("artworks.artworkId", "name image price category,quantity")
            .sort({ updatedAt: -1 });

        res.json({ orders });
    } catch (error) {
        res.status(500).json({
            message: "Confirmed orders fetch failed",
            error: error.message,
        });
    }
};

exports.getBuyerOrdersHistory = async (req, res) => {
    try {
        const { userId, filter } = req.params;

        let query = {
            buyerId: userId,
            orderStatus: "confirmed",
        };

        const now = new Date();

        if (filter === "this-month") {
            query.updatedAt = {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            };
        }

        if (filter === "last-month") {
            query.updatedAt = {
                $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                $lt: new Date(now.getFullYear(), now.getMonth(), 1),
            };
        }

        if (filter === "last-year") {
            query.updatedAt = {
                $gte: new Date(now.getFullYear() - 1, 0, 1),
                $lt: new Date(now.getFullYear(), 0, 1),
            };
        }

        const orders = await Order.find(query)
            .populate("buyerId", "firstName lastName email")
            .populate("artworks.sellerId", "firstName lastName email")
            .populate("artworks.artworkId", "name image price category,quantity")
            .sort({ updatedAt: -1 });

        res.json({ orders });
    } catch (error) {
        res.status(500).json({
            message: "Orders history fetch failed",
            error: error.message,
        });
    }
};

exports.clearBuyerOrderHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findByIdAndUpdate(
            id,
            {
                buyerId: null,
            },
            {
                returnDocument: "after",
            }
        );

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        res.json({
            message: "Order removed from history",
        });
    } catch (error) {
        res.status(500).json({
            message: "History clear failed",
            error: error.message,
        });
    }
};

exports.getSellerSalesHistory = async (req, res) => {
    try {
        const { sellerId } = req.params;

        const orders = await Order.find({
            orderStatus: "confirmed",
            "artworks.sellerId": sellerId,
        })
            .populate("buyerId", "firstName lastName email")
            .populate("artworks.sellerId", "firstName lastName email")
            .populate("artworks.artworkId", "name image price category,quantity")
            .sort({ updatedAt: -1 });

        res.json({ orders });
    } catch (error) {
        res.status(500).json({
            message: "Sales history fetch failed",
            error: error.message,
        });
    }
};