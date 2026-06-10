const Activity = require("../models/Activity");

exports.createActivity = async (req, res) => {
    try {
        const { title, description, userId, type } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        const activity = await Activity.create({
            title,
            description,
            userId: userId || null,
            type: type || "general",
        });

        res.status(201).json({
            message: "Activity created successfully",
            activity,
        });
    } catch (error) {
        res.status(500).json({ message: "Activity create failed", error: error.message });
    }
};

exports.getUserActivities = async (req, res) => {
    try {
        const { userId } = req.params;

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const activities = await Activity.find({
            createdAt: { $gte: last24Hours },
            $or: [{ userId }, { userId: null }],
        }).sort({ createdAt: -1 });

        res.json({ activities });
    } catch (error) {
        res.status(500).json({
            message: "Activities fetch failed",
            error: error.message,
        });
    }
};

exports.getAllActivities = async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate("userId", "firstName lastName email role")
            .sort({ createdAt: -1 });

        res.json({ activities });
    } catch (error) {
        res.status(500).json({ message: "Activities fetch failed", error: error.message });
    }
};

// Edit activity
exports.updateActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, userId, type } = req.body;

        const activity = await Activity.findByIdAndUpdate(
            id,
            { title, description, userId: userId || null, type: type || "general" },
            { returnDocument: "after" }
        );

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        res.json({
            message: "Activity updated successfully",
            activity,
        });
    } catch (error) {
        res.status(500).json({ message: "Activity update failed", error: error.message });
    }
};

// Delete activity
exports.deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;

        const activity = await Activity.findByIdAndDelete(id);

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        res.json({ message: "Activity deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Activity delete failed", error: error.message });
    }
};