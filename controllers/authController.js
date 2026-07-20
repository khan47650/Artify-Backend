const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("../utils/cloudinary");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const normalizeEmail = (email = "") => {
  return typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
};

const cleanText = (value = "") => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const generatePlainPassword = () => {
  const text = Math.random().toString(36).slice(-8);
  const numbers = Math.floor(1000 + Math.random() * 9000);

  return `${text}${numbers}`;
};

const buildUserResponse = (user) => ({
  id: user._id,
  role: user.role,
  accountStatus: user.accountStatus || "active",

  firstName: user.firstName || "",
  lastName: user.lastName || "",
  email: user.email,

  phoneNumber: user.phoneNumber || "",

  addressLine1: user.addressLine1 || "",
  addressLine2: user.addressLine2 || "",
  city: user.city || "",
  state: user.state || "",
  postalCode: user.postalCode || "",
  country: user.country || "",

  artistPhoto: user.artistPhoto || "",
});

const sendEmailSafely = async (email, subject, html) => {
  try {
    await sendEmail(email, subject, html);
    return true;
  } catch (error) {
    console.error("Email sending error:", error.message);
    return false;
  }
};

const uploadProfileImage = async (image) => {
  if (!image || typeof image !== "string") {
    return "";
  }

  if (!image.startsWith("data:image")) {
    return image;
  }

  const uploadedResponse = await cloudinary.uploader.upload(image, {
    folder: "mowa-gallery/users",
    resource_type: "image",
  });

  return uploadedResponse.secure_url;
};

/* =========================================================
   SIGNUP
========================================================= */

exports.signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      artistPhoto,
      email,
      password,
    } = req.body;

    const cleanedFirstName = cleanText(firstName);
    const cleanedLastName = cleanText(lastName);
    const cleanedPhoneNumber = cleanText(phoneNumber);
    const normalizedEmail = normalizeEmail(email);

    if (
      !cleanedFirstName ||
      !cleanedLastName ||
      !cleanedPhoneNumber ||
      !normalizedEmail ||
      !password
    ) {
      return res.status(400).json({
        message:
          "First name, last name, mobile number, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    let uploadedProfilePhoto = "";

    if (artistPhoto) {
      uploadedProfilePhoto = await uploadProfileImage(artistPhoto);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      role: "user",
      accountStatus: "active",

      firstName: cleanedFirstName,
      lastName: cleanedLastName,
      phoneNumber: cleanedPhoneNumber,

      artistPhoto: uploadedProfilePhoto,

      email: normalizedEmail,
      password: hashedPassword,
    });

    await sendEmailSafely(
      normalizedEmail,
      "Welcome to Mowa Gallery",
      `
        <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
            <h1 style="color:#111;">Welcome to Mowa Gallery 🎨</h1>

            <p>Hi ${cleanedFirstName || "there"},</p>

            <p>
              Your Mowa Gallery account has been created successfully.
            </p>

            <p>
              You can now discover, collect, upload, and sell artworks
              using the same account.
            </p>

            <p style="margin-top:24px;">
              Regards,<br/>
              <strong>Mowa Gallery Team</strong>
            </p>
          </div>
        </div>
      `
    );

    const token = generateToken(user);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
};

/* =========================================================
   LOGIN
========================================================= */

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.accountStatus === "freeze") {
      return res.status(403).json({
        message:
          "Your account has been frozen. Please contact Mowa Gallery support.",
      });
    }

    await sendEmailSafely(
      normalizedEmail,
      "New Login on Mowa Gallery",
      `
        <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
            <h1 style="color:#111;">Login Alert</h1>

            <p>Hi ${user.firstName || "there"},</p>

            <p>
              Your account was just logged in on
              <strong>Mowa Gallery</strong>.
            </p>

            <p>If this was you, no action is needed.</p>

            <p>
              If this was not you, please change your password immediately.
            </p>

            <p style="margin-top:24px;">
              Regards,<br/>
              <strong>Mowa Gallery Team</strong>
            </p>
          </div>
        </div>
      `
    );

    const token = generateToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email",
      });
    }

    const newPassword = generatePlainPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    await user.save();

    const emailSent = await sendEmailSafely(
      normalizedEmail,
      "Your New Mowa Gallery Password",
      `
        <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
            <h1 style="color:#111;">Password Reset</h1>

            <p>Hi ${user.firstName || "there"},</p>

            <p>
              Your Mowa Gallery password has been reset successfully.
            </p>

            <p>Your new password is:</p>

            <div style="font-size:22px;font-weight:bold;background:#f1f1f1;padding:14px;border-radius:10px;text-align:center;letter-spacing:1px;">
              ${newPassword}
            </div>

            <p>
              Please login using this password and change it from
              your account settings.
            </p>

            <p style="margin-top:24px;">
              Regards,<br/>
              <strong>Mowa Gallery Team</strong>
            </p>
          </div>
        </div>
      `
    );

    if (!emailSent) {
      return res.status(500).json({
        message:
          "Password was updated but the email could not be sent",
      });
    }

    return res.json({
      message:
        "New password has been sent to your registered email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Forgot password failed",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE PROFILE
========================================================= */

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
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    let uploadedImage = user.artistPhoto || "";

    if (
      artistPhoto &&
      typeof artistPhoto === "string" &&
      artistPhoto.startsWith("data:image")
    ) {
      uploadedImage = await uploadProfileImage(artistPhoto);
    }

    if (artistPhoto === "") {
      uploadedImage = "";
    }

    user.firstName =
      firstName !== undefined
        ? cleanText(firstName)
        : user.firstName;

    user.lastName =
      lastName !== undefined
        ? cleanText(lastName)
        : user.lastName;

    user.phoneNumber =
      phoneNumber !== undefined
        ? cleanText(phoneNumber)
        : user.phoneNumber;

    user.addressLine1 =
      addressLine1 !== undefined
        ? cleanText(addressLine1)
        : user.addressLine1;

    user.addressLine2 =
      addressLine2 !== undefined
        ? cleanText(addressLine2)
        : user.addressLine2;

    user.city =
      city !== undefined
        ? cleanText(city)
        : user.city;

    user.state =
      state !== undefined
        ? cleanText(state)
        : user.state;

    user.postalCode =
      postalCode !== undefined
        ? cleanText(postalCode)
        : user.postalCode;

    user.country =
      country !== undefined
        ? cleanText(country)
        : user.country;

    user.artistPhoto = uploadedImage;

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Profile update error:", error);

    return res.status(500).json({
      message: "Profile update failed",
      error: error.message,
    });
  }
};

/* =========================================================
   CHANGE PASSWORD
========================================================= */

exports.changePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    await user.save();

    await sendEmailSafely(
      user.email,
      "Mowa Gallery Password Updated",
      `
        <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
            <h1 style="color:#111;">Password Updated</h1>

            <p>Hi ${user.firstName || "there"},</p>

            <p>
              Your Mowa Gallery account password has been updated successfully.
            </p>

            <p>
              If this was not you, please contact support immediately.
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
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Password update error:", error);

    return res.status(500).json({
      message: "Password update failed",
      error: error.message,
    });
  }
};

/* =========================================================
   GOOGLE LOGIN
========================================================= */

exports.googleLogin = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      artistPhoto,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const cleanedFirstName = cleanText(firstName);
    const cleanedLastName = cleanText(lastName);

    const googleProfilePhoto =
      typeof artistPhoto === "string"
        ? artistPhoto.trim()
        : "";

    let user = await User.findOne({
      email: normalizedEmail,
    });

    /*
      Existing frozen user ko login allow nahi karna.
    */
    if (user && user.accountStatus === "freeze") {
      return res.status(403).json({
        message:
          "Your account has been frozen. Please contact Mowa Gallery support.",
      });
    }

    /*
      Existing Google user ki latest photo aur missing
      name information database mein update kar do.
    */
    if (user) {
      let shouldUpdateUser = false;

      if (
        googleProfilePhoto &&
        user.artistPhoto !== googleProfilePhoto
      ) {
        user.artistPhoto = googleProfilePhoto;
        shouldUpdateUser = true;
      }

      if (!user.firstName && cleanedFirstName) {
        user.firstName = cleanedFirstName;
        shouldUpdateUser = true;
      }

      if (!user.lastName && cleanedLastName) {
        user.lastName = cleanedLastName;
        shouldUpdateUser = true;
      }

      if (shouldUpdateUser) {
        await user.save();
      }
    }

    /*
      Email pehle registered na ho to naya unified
      user account create karo.
    */
    if (!user) {
      const randomPassword = generatePlainPassword();

      const hashedPassword = await bcrypt.hash(
        randomPassword,
        12
      );

      user = await User.create({
        role: "user",
        accountStatus: "active",

        firstName: cleanedFirstName,
        lastName: cleanedLastName,

        email: normalizedEmail,
        password: hashedPassword,

        artistPhoto: googleProfilePhoto,
      });

      await sendEmailSafely(
        normalizedEmail,
        "Welcome to Mowa Gallery",
        `
          <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
            <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
              <h1 style="color:#111;">
                Welcome to Mowa Gallery 🎨
              </h1>

              <p>
                Hi ${cleanedFirstName || "there"},
              </p>

              <p>
                Your Mowa Gallery account has been created successfully through Google.
              </p>

              <p>
                You can use the same account to discover, collect, upload, and sell artworks.
              </p>

              <p style="margin-top:24px;">
                Regards,<br/>
                <strong>Mowa Gallery Team</strong>
              </p>
            </div>
          </div>
        `
      );
    }

    const token = generateToken(user);

    return res.json({
      message: "Google login successful",
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(500).json({
      message: "Google login failed",
      error: error.message,
    });
  }
};