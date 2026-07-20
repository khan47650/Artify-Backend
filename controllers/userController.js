const User = require("../models/User");
const Artwork = require("../models/Artwork");
const Activity = require("../models/Activity");
const sendEmail = require("../utils/sendEmail");

const sendEmailSafely = async (email, subject, html) => {
  try {
    await sendEmail(email, subject, html);
  } catch (error) {
    console.error("User email sending error:", error.message);
  }
};

const getUserWithStats = async (user) => {
  const totalArts = await Artwork.countDocuments({
    userId: user._id,
  });

  const totalSales = await Artwork.countDocuments({
    userId: user._id,
    sellingStatus: "sold",
  });

  return {
    ...user.toObject(),
    totalArts,
    totalSales,
  };
};

/* =========================================================
   GET ALL NORMAL USERS
========================================================= */

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: "user",
    }).sort({
      createdAt: -1,
    });

    const usersWithStats = await Promise.all(
      users.map((user) => getUserWithStats(user))
    );

    return res.json({
      users: usersWithStats,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/* =========================================================
   GET USERS WHO HAVE UPLOADED ARTWORKS
========================================================= */

exports.getAllArtists = async (req, res) => {
  try {
    const artistIds = await Artwork.distinct("userId", {
      userId: {
        $ne: null,
      },
    });

    const artists = await User.find({
      _id: {
        $in: artistIds,
      },
      role: "user",
      accountStatus: "active",
    }).sort({
      createdAt: -1,
    });

    const artistsWithStats = await Promise.all(
      artists.map((artist) => getUserWithStats(artist))
    );

    return res.json({
      artists: artistsWithStats,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch artists",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE USER ACCOUNT STATUS
========================================================= */

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!["active", "freeze"].includes(accountStatus)) {
      return res.status(400).json({
        message: "Invalid account status",
      });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: id,
        role: "user",
      },
      {
        accountStatus,
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isFrozen = accountStatus === "freeze";

    await Activity.create({
      title: isFrozen
        ? "Account Frozen"
        : "Account Unfrozen",

      description: isFrozen
        ? "Your Mowa Gallery account has been frozen by admin."
        : "Your Mowa Gallery account has been restored and is active again.",

      userId: user._id,
      type: "account",
    });

    await sendEmailSafely(
      user.email,
      isFrozen
        ? "Your Mowa Gallery Account Has Been Frozen"
        : "Your Mowa Gallery Account Has Been Unfrozen",
      `
        <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
            <h1 style="color:#111;">
              ${isFrozen ? "Account Frozen" : "Account Unfrozen"}
            </h1>

            <p>Hi ${user.firstName || "there"},</p>

            <p>
              ${isFrozen
        ? "Your Mowa Gallery account has been frozen by the admin."
        : "Your Mowa Gallery account has been unfrozen and is active again."
      }
            </p>

            <p style="margin-top:24px;">
              Regards,<br/>
              <strong>Mowa Gallery Team</strong>
            </p>
          </div>
        </div>
      `
    );

    return res.json({
      message: isFrozen
        ? "User account frozen successfully"
        : "User account unfrozen successfully",

      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "User status update failed",
      error: error.message,
    });
  }
};

/* =========================================================
   GET ARTWORKS UPLOADED BY A USER
========================================================= */

exports.getUserArtworks = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      role: "user",
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const artworks = await Artwork.find({
      userId: id,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      artworks,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user artworks",
      error: error.message,
    });
  }
};

/* =========================================================
   GET SINGLE USER
========================================================= */

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      role: "user",
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userWithStats = await getUserWithStats(user);

    return res.json({
      user: userWithStats,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};