const express = require("express");
const { signup, login, forgotPassword,
    updateProfile,
    changePassword, } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.put("/profile", updateProfile);
router.put("/change-password",changePassword);

module.exports = router;