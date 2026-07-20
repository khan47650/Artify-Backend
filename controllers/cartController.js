const Cart = require("../models/Cart");
const Artwork = require("../models/Artwork");
const User = require("../models/User");

const getArtworkOwnerId = (artwork) => {
    if (!artwork?.userId) return null;

    return artwork.userId._id || artwork.userId;
};

const isOwnArtwork = (userId, artwork) => {
    const ownerId = getArtworkOwnerId(artwork);

    return Boolean(
        userId &&
        ownerId &&
        String(userId) === String(ownerId)
    );
};

exports.addToCart = async (req, res) => {
    try {
        const {
            userId,
            artworkId,
            quantity = 1,
        } = req.body;

        if (!userId || !artworkId) {
            return res.status(400).json({
                message:
                    "UserId and artworkId are required",
            });
        }

        const requestedQty = Number(quantity);

        if (
            !Number.isInteger(requestedQty) ||
            requestedQty < 1
        ) {
            return res.status(400).json({
                message:
                    "Quantity must be a whole number of at least 1",
            });
        }

        const user = await User.findById(userId);

        if (!user || user.role !== "user") {
            return res.status(403).json({
                message:
                    "Only registered users can add artworks to cart",
            });
        }

        if (user.accountStatus === "freeze") {
            return res.status(403).json({
                message:
                    "Your account is frozen. You cannot add artworks to cart.",
            });
        }

        const artwork = await Artwork.findById(
            artworkId
        ).populate(
            "userId",
            "firstName lastName accountStatus"
        );

        if (!artwork) {
            return res.status(404).json({
                message: "Artwork not found",
            });
        }

        if (isOwnArtwork(userId, artwork)) {
            return res.status(403).json({
                message:
                    "You cannot add your own artwork to the cart",
            });
        }

        if (
            artwork.approvedStatus !== "approved"
        ) {
            return res.status(400).json({
                message: "Artwork is not approved yet",
            });
        }

        if (
            artwork.sellingStatus === "sold" ||
            Number(artwork.quantity || 0) <= 0
        ) {
            return res.status(400).json({
                message: "Artwork is already sold",
            });
        }

        if (
            requestedQty >
            Number(artwork.quantity || 0)
        ) {
            return res.status(400).json({
                message: `Only ${artwork.quantity} item(s) available`,
            });
        }

        if (
            artwork.userId?.accountStatus ===
            "freeze"
        ) {
            return res.status(400).json({
                message:
                    "This artwork owner's account is frozen",
            });
        }

        const existing = await Cart.findOne({
            userId,
            artworkId,
        });

        if (existing) {
            existing.quantity = requestedQty;

            await existing.save();

            return res.json({
                message: "Cart quantity updated",
                cartItem: existing,
            });
        }

        const cartItem = await Cart.create({
            userId,
            artworkId,
            quantity: requestedQty,
        });

        return res.status(201).json({
            message: "Artwork added to cart",
            cartItem,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Add to cart failed",
            error: error.message,
        });
    }
};

exports.getUserCart = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);

        if (!user || user.role !== "user") {
            return res.status(403).json({
                message:
                    "Only registered users can access a cart",
            });
        }

        if (user.accountStatus === "freeze") {
            return res.status(403).json({
                message:
                    "Your account is frozen. You cannot access the cart.",
            });
        }

        const cartItems = await Cart.find({
            userId,
        })
            .populate({
                path: "artworkId",
                populate: {
                    path: "userId",
                    select:
                        "firstName lastName accountStatus",
                },
            })
            .sort({
                createdAt: -1,
            });

        const filtered = cartItems.filter(
            (item) =>
                item.artworkId &&
                item.artworkId.approvedStatus ===
                "approved" &&
                item.artworkId.sellingStatus !==
                "sold" &&
                Number(
                    item.artworkId.quantity || 0
                ) > 0 &&
                item.artworkId.userId
                    ?.accountStatus !== "freeze" &&
                !isOwnArtwork(
                    userId,
                    item.artworkId
                )
        );

        const totalPrice = filtered.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.artworkId.price || 0
                ) *
                Number(item.quantity || 1),
            0
        );

        return res.json({
            cartItems: filtered,
            totalItems: filtered.length,
            totalPrice,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Cart fetch failed",
            error: error.message,
        });
    }
};

exports.removeFromCart = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const deleted =
            await Cart.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                message: "Cart item not found",
            });
        }

        return res.json({
            message: "Item removed from cart",
        });
    } catch (error) {
        return res.status(500).json({
            message:
                "Remove cart item failed",
            error: error.message,
        });
    }
};

exports.clearCart = async (req, res) => {
    try {
        const { userId } = req.params;

        await Cart.deleteMany({
            userId,
        });

        return res.json({
            message:
                "Cart cleared successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Clear cart failed",
            error: error.message,
        });
    }
};

exports.updateCartQuantity = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        const cartItem = await Cart.findById(
            id
        ).populate({
            path: "artworkId",
            populate: {
                path: "userId",
                select:
                    "firstName lastName accountStatus",
            },
        });

        if (!cartItem) {
            return res.status(404).json({
                message: "Cart item not found",
            });
        }

        if (!cartItem.artworkId) {
            return res.status(404).json({
                message:
                    "Artwork linked with this cart item was not found",
            });
        }

        if (
            isOwnArtwork(
                cartItem.userId,
                cartItem.artworkId
            )
        ) {
            await Cart.findByIdAndDelete(id);

            return res.status(403).json({
                message:
                    "You cannot keep your own artwork in the cart",
            });
        }

        const requestedQty =
            Number(quantity);

        if (
            !Number.isInteger(requestedQty) ||
            requestedQty < 1
        ) {
            return res.status(400).json({
                message:
                    "Quantity must be a whole number of at least 1",
            });
        }

        if (
            cartItem.artworkId
                .approvedStatus !== "approved"
        ) {
            return res.status(400).json({
                message:
                    "Artwork is not approved",
            });
        }

        if (
            cartItem.artworkId
                .sellingStatus === "sold" ||
            Number(
                cartItem.artworkId.quantity || 0
            ) <= 0
        ) {
            return res.status(400).json({
                message:
                    "Artwork is no longer available",
            });
        }

        if (
            cartItem.artworkId.userId
                ?.accountStatus === "freeze"
        ) {
            return res.status(400).json({
                message:
                    "This artwork owner's account is frozen",
            });
        }

        if (
            requestedQty >
            Number(
                cartItem.artworkId.quantity || 0
            )
        ) {
            return res.status(400).json({
                message: `Only ${cartItem.artworkId.quantity} item(s) available`,
            });
        }

        cartItem.quantity = requestedQty;

        await cartItem.save();

        return res.json({
            message:
                "Cart quantity updated",
            cartItem,
        });
    } catch (error) {
        return res.status(500).json({
            message:
                "Quantity update failed",
            error: error.message,
        });
    }
};