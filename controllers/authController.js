const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("../utils/cloudinary");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const generatePlainPassword = () => {
  return Math.random().toString(36).slice(-8) + Math.floor(1000 + Math.random() * 9000);
};

const buildUserResponse = (user) => ({
  id: user._id,
  role: user.role,
  accountStatus: user.accountStatus || "active",

  firstName: user.firstName,
  lastName: user.lastName,

  email: user.email,

  phoneNumber: user.phoneNumber,
  addressLine1: user.addressLine1,
  addressLine2: user.addressLine2,

  city: user.city,
  state: user.state,
  postalCode: user.postalCode,
  country: user.country,

  artistPhoto: user.artistPhoto,
  introduction: user.introduction,
});

exports.signup = async (req, res) => {
  try {
    const {
      role,
      firstName,
      lastName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      artistPhoto,
      introduction,
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.role === "buyer" && role === "seller") {
        return res.status(409).json({
          message: "This email is already registered as buyer. Please use another email for seller account.",
        });
      }

      if (existingUser.role === "seller" && role === "buyer") {
        return res.status(409).json({
          message: "This email is already registered as seller. Please use another email for buyer account.",
        });
      }

      return res.status(409).json({
        message: `This email is already registered as ${existingUser.role}`,
      });
    }

    let uploadedArtistPhoto = "";

    if (artistPhoto) {
      const uploadedResponse = await cloudinary.uploader.upload(artistPhoto, {
        folder: role === "seller" ? "artify-artists" : "artify-buyers",
      });

      uploadedArtistPhoto = uploadedResponse.secure_url;
    }

    const user = await User.create({
      role,
      accountStatus: "active",
      firstName,
      lastName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      artistPhoto: uploadedArtistPhoto,
      introduction,
      email: normalizedEmail,
      password,
    });

    await sendEmail(
      normalizedEmail,
      "Welcome to Artify",
      `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
          <h1 style="color:#111;">Welcome to Artify 🎨</h1>
          <p>Hi ${firstName || "there"},</p>
          <p>Your Artify account has been created successfully.</p>
          <p>You can now discover, collect, and sell digital artworks on Artify.</p>
          <p style="margin-top:24px;">Regards,<br/><strong>Artify Team</strong></p>
        </div>
      </div>
      `
    );

    const token = generateToken(user);

    res.status(201).json({
      message: "Signup successful",
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }


    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is registered as ${user.role}` });
    }
    await sendEmail(
      normalizedEmail,
      "New Login on Artify",
      `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
          <h1 style="color:#111;">Login Alert</h1>
          <p>Hi ${user.firstName || "there"},</p>
          <p>Your account was just logged in on <strong>Artify</strong>.</p>
          <p>If this was you, no action is needed.</p>
          <p>If this was not you, please change your password immediately.</p>
          <p style="margin-top:24px;">Regards,<br/><strong>Artify Team</strong></p>
        </div>
      </div>
      `
    );

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const newPassword = generatePlainPassword();

    user.password = newPassword;
    await user.save();

    const emailSent = await sendEmail(
      normalizedEmail,
      "Your New Artify Password",
      `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
          <h1 style="color:#111;">Password Reset</h1>
          <p>Hi ${user.firstName || "there"},</p>
          <p>Your Artify password has been reset successfully.</p>
          <p>Your new password is:</p>
          <div style="font-size:22px;font-weight:bold;background:#f1f1f1;padding:14px;border-radius:10px;text-align:center;letter-spacing:1px;">
            ${newPassword}
          </div>
          <p>Please login using this password.</p>
          <p style="margin-top:24px;">Regards,<br/><strong>Artify Team</strong></p>
        </div>
      </div>
      `
    );

    if (!emailSent) {
      return res.status(500).json({ message: "Password updated but email could not be sent" });
    }

    res.json({ message: "New password has been sent to your registered email" });
  } catch (error) {
    res.status(500).json({ message: "Forgot password failed", error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      userId,
      firstName,
      lastName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      artistPhoto,
      introduction,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let uploadedImage = user.artistPhoto;

    if (artistPhoto && artistPhoto.startsWith("data:image")) {
      const uploadedResponse = await cloudinary.uploader.upload(artistPhoto, {
        folder: user.role === "seller" ? "artify-artists" : "artify-buyers",
      });

      uploadedImage = uploadedResponse.secure_url;
    }

    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.phoneNumber = phoneNumber ?? user.phoneNumber;
    user.addressLine1 = addressLine1 ?? user.addressLine1;
    user.addressLine2 = addressLine2 ?? user.addressLine2;
    user.city = city ?? user.city;
    user.state = state ?? user.state;
    user.postalCode = postalCode ?? user.postalCode;
    user.country = country ?? user.country;
    user.artistPhoto = uploadedImage;
    user.introduction = introduction ?? user.introduction;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Profile update failed", error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    await sendEmail(
      user.email,
      "Artify Password Updated",
      `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
          <h1 style="color:#111;">Password Updated</h1>
          <p>Hi ${user.firstName || "there"},</p>
          <p>Your Artify account password has been updated successfully.</p>
          <p>If this was not you, please contact support immediately.</p>
          <p style="margin-top:24px;">Regards,<br/><strong>Artify Team</strong></p>
        </div>
      </div>
      `
    );

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Password update failed", error: error.message });
  }
};