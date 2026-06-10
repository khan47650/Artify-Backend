const express = require("express");
const {
  createActivity,
  getUserActivities,
  getAllActivities,
  updateActivity,
  deleteActivity,
} = require("../controllers/activityController");

const router = express.Router();

router.post("/", createActivity);
router.get("/", getAllActivities);
router.get("/user/:userId", getUserActivities);
router.put("/:id", updateActivity);
router.delete("/:id", deleteActivity);

module.exports = router;