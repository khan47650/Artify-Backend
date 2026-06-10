const ContactMessage = require("../models/ContactMessage");
const sendEmail = require("../utils/sendEmail");

exports.createMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const contactMessage = await ContactMessage.create({
            name,
            email,
            subject,
            message,
        });

        res.status(201).json({
            message: "Message sent successfully",
            contactMessage,
        });
    } catch (error) {
        res.status(500).json({ message: "Message send failed", error: error.message });
    }
};

exports.getAllMessages = async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ message: "Messages fetch failed", error: error.message });
    }
};

exports.replyMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        if (!reply) {
            return res.status(400).json({ message: "Reply is required" });
        }

        const message = await ContactMessage.findById(id);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const emailSent = await sendEmail(
            message.email,
            `Reply from Artify: ${message.subject}`,
            `
      <div style="font-family:Arial,sans-serif;background:#f7f7f7;padding:30px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;">
          <h1 style="color:#111;">Artify Support Reply</h1>
          <p>Hi ${message.name || "there"},</p>
          <p>${reply}</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
          <p style="font-size:13px;color:#666;">Your original message:</p>
          <p style="font-size:13px;color:#333;">${message.message}</p>
          <p style="margin-top:24px;">Regards,<br/><strong>Artify Team</strong></p>
        </div>
      </div>
      `
        );

        if (!emailSent) {
            return res.status(500).json({ message: "Reply email could not be sent" });
        }

        message.reply = reply;
        message.replied = true;
        await message.save();

        res.json({ message: "Reply sent successfully", contactMessage: message });
    } catch (error) {
        res.status(500).json({ message: "Reply failed", error: error.message });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;

        const message = await ContactMessage.findByIdAndDelete(id);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        res.json({ message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Delete failed", error: error.message });
    }
};

exports.deleteAllMessages = async (req, res) => {
    try {
        await ContactMessage.deleteMany({});
        res.json({ message: "All messages deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Delete all failed", error: error.message });
    }
};