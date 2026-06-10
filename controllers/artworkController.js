const Artwork = require("../models/Artwork");
const cloudinary = require("../utils/cloudinary");
const Activity = require("../models/Activity");
const User = require("../models/User");

exports.addArtwork = async (req, res) => {
    try {
        const { image, name, userId, description, price, category, quantity } = req.body;

        if (!image || !name || !userId || !description || !price || !category || quantity === undefined) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const uploaded = await cloudinary.uploader.upload(image, {
            folder: "artify-artworks",
        });

        const artwork = await Artwork.create({
            image: uploaded.secure_url,
            name,
            userId,
            description,
            price,
            category,
            quantity: Number(quantity),
            sellingStatus: Number(quantity) > 0 ? "pending" : "sold",
        });

        res.status(201).json({ message: "Artwork added successfully", artwork });
    } catch (error) {
        res.status(500).json({ message: "Artwork add failed", error: error.message });
    }
};

exports.getAllArtworks = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const activeUsers = await User.find({
            accountStatus: { $ne: "freeze" },
        }).select("_id");

        const activeUserIds = activeUsers.map((user) => user._id);

        const filter = {
            userId: { $in: activeUserIds },
            sellingStatus: { $ne: "sold" },
        };

        const total = await Artwork.countDocuments(filter);

        const artworks = await Artwork.find(filter)
            .populate("userId", "firstName lastName email accountStatus")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            artworks,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch artworks",
            error: error.message,
        });
    }
};
exports.getCurrentUserArtworks = async (req, res) => {
    try {
        const { userId } = req.params;

        const artworks = await Artwork.find({ userId }).sort({ createdAt: -1 });

        res.json({ artworks });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch user artworks", error: error.message });
    }
};

exports.updateArtwork = async (req, res) => {
    try {
        const { id } = req.params;
        const { image, name, description, price, category, quantity } = req.body;

        const artwork = await Artwork.findById(id);

        if (!artwork) {
            return res.status(404).json({ message: "Artwork not found" });
        }

        let updatedImage = artwork.image;

        if (image && image.startsWith("data:image")) {
            const uploaded = await cloudinary.uploader.upload(image, {
                folder: "artify-artworks",
            });
            updatedImage = uploaded.secure_url;
        }

        artwork.image = updatedImage;
        artwork.name = name ?? artwork.name;
        artwork.description = description ?? artwork.description;
        artwork.price = price ?? artwork.price;
        artwork.category = category ?? artwork.category;
        if (quantity !== undefined) {
            artwork.quantity = Number(quantity);
            artwork.sellingStatus = Number(quantity) > 0 ? "pending" : "sold";
        }

        await artwork.save();

        res.json({ message: "Artwork updated successfully", artwork });
    } catch (error) {
        res.status(500).json({ message: "Artwork update failed", error: error.message });
    }
};

exports.deleteArtwork = async (req, res) => {
    try {
        const { id } = req.params;

        const artwork = await Artwork.findByIdAndDelete(id);

        if (!artwork) {
            return res.status(404).json({ message: "Artwork not found" });
        }

        res.json({ message: "Artwork deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Artwork delete failed", error: error.message });
    }
};

exports.getArtworkStats = async (req, res) => {
    try {
        const { userId } = req.params;

        const totalArts = await Artwork.countDocuments({
            userId,

        });

        const notVerified = await Artwork.countDocuments({
            userId,
            approvedStatus: "pending",
        });

        const pending = await Artwork.countDocuments({
            userId,
            sellingStatus: "pending",
        });

        const sold = await Artwork.countDocuments({
            userId,
            sellingStatus: "sold",
        });

        res.json({
            totalArts,
            notVerified,
            pending,
            sold,
        });
    } catch (error) {
        res.status(500).json({ message: "Stats fetch failed", error: error.message });
    }
};

exports.getPendingArtworks = async (req, res) => {
    try {
        const artworks = await Artwork.find({ approvedStatus: "pending" })
            .populate("userId", "firstName lastName email")
            .sort({ createdAt: -1 });

        res.json({ artworks });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch pending artworks",
            error: error.message,
        });
    }
};

exports.approveArtwork = async (req, res) => {
    try {
        const { id } = req.params;

        const artwork = await Artwork.findByIdAndUpdate(
            id,
            { approvedStatus: "approved" },
            { returnDocument: "after" }
        );

        await Activity.create({
            title: "Artwork Approved",
            description: `Your artwork "${artwork.name}" has been approved by admin.`,
            userId: artwork.userId,
            type: "artwork_approved",
        });

        if (!artwork) {
            return res.status(404).json({ message: "Artwork not found" });
        }

        res.json({
            message: "Artwork approved successfully",
            artwork,
        });
    } catch (error) {
        res.status(500).json({
            message: "Artwork approval failed",
            error: error.message,
        });
    }
};

exports.rejectArtwork = async (req, res) => {
    try {
        const { id } = req.params;

        const artwork = await Artwork.findById(id);

        if (!artwork) {
            return res.status(404).json({ message: "Artwork not found" });
        }

        await Activity.create({
            title: "Artwork Rejected",
            description: `Your artwork "${artwork.name}" has been rejected by admin.`,
            userId: artwork.userId,
            type: "general",
        });

        await Artwork.findByIdAndDelete(id);

        res.json({ message: "Artwork rejected successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Artwork reject failed",
            error: error.message,
        });
    }
};