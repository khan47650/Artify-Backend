const express = require("express");
const {
  createMessage,
  getAllMessages,
  replyMessage,
  deleteMessage,
  deleteAllMessages,
} = require("../controllers/contactMessageController");

const router = express.Router();

router.post("/", createMessage);
router.get("/", getAllMessages);
router.post("/reply/:id", replyMessage);
router.delete("/delete-all", deleteAllMessages);
router.delete("/:id", deleteMessage);

module.exports = router;