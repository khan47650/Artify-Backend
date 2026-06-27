const express = require("express");
const { signup, login, forgotPassword, updateProfile, changePassword, googleLogin } = require("../controllers/authController");
    

const router = express.Router();

router.post("/google-login", googleLogin);
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.put("/profile", updateProfile);
router.put("/change-password",changePassword);

module.exports = router;