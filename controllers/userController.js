const User = require("../models/User");
const Artwork = require("../models/Artwork");
const Activity = require("../models/Activity");
const sendEmail = require("../utils/sendEmail");

exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await User.find({ role: "seller" }).sort({ createdAt: -1 });

    const sellersWithStats = await Promise.all(
      sellers.map(async (seller) => {
        const totalArts = await Artwork.countDocuments({ userId: seller._id });
        const soldArts = await Artwork.countDocuments({
          userId: seller._id,
          sellingStatus: "sold",
        });

        return {
          ...seller.toObject(),
          totalArts,
          totalSales: soldArts,
        };
      })
    );

    res.json({ sellers: sellersWithStats });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sellers", error: error.message });
  }
};

exports.updateSellerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    const seller = await User.findByIdAndUpdate(
      id,
      { accountStatus },
      { returnDocument: "after" }
    );

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const isFreeze = accountStatus === "freeze";

    await Activity.create({
      title: isFreeze ? "Account Frozen" : "Account Unfrozen",
      description: isFreeze
        ? "Your Artify seller account has been frozen by admin."
        : "Your Artify seller account has been restored and is active again.",
      userId: seller._id,
      type: "account",
    });

    await sendEmail(
      seller.email,
      isFreeze ? "Your Artify Account Has Been Frozen" : "Your Artify Account Has Been Unfrozen",
      `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
          <h1 style="color:#111;">${isFreeze ? "Account Frozen" : "Account Unfrozen"}</h1>
          <p>Hi ${seller.firstName || "there"},</p>
          <p>${isFreeze
        ? "Your seller account has been frozen by Artify admin."
        : "Your seller account has been unfrozen and is active again."
      }</p>
          <p style="margin-top:24px;">Regards,<br/><strong>Artify Team</strong></p>
        </div>
      </div>
      `
    );

    res.json({
      message: isFreeze ? "Seller account frozen successfully" : "Seller account unfrozen successfully",
      seller,
    });
  } catch (error) {
    res.status(500).json({ message: "Seller status update failed", error: error.message });
  }
};

exports.getSellerArtworks = async (req, res) => {
  try {
    const { id } = req.params;

    const artworks = await Artwork.find({ userId: id }).sort({ createdAt: -1 });

    res.json({ artworks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch seller artworks", error: error.message });
  }
};

exports.getSellerById = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await User.findOne({
      _id: id,
      role: "seller",
    }).select("-password");

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const totalArts = await Artwork.countDocuments({ userId: seller._id });

    const totalSales = await Artwork.countDocuments({
      userId: seller._id,
      sellingStatus: "sold",
    });

    res.json({
      seller: {
        ...seller.toObject(),
        totalArts,
        totalSales,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch seller",
      error: error.message,
    });
  }
};