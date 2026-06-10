const axios = require("axios");

async function sendEmail(to, subject, html, attachments = []) {
  try {
    const emailData = {
      sender: {
        email: "artifyofficial1122@gmail.com",
        name: "Artify",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    if (attachments.length > 0) {
      emailData.attachment = attachments.map((file) => ({
        name: file.filename,
        content: file.content.toString("base64"),
      }));
    }

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      emailData,
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    console.log("Brevo email sent:", response.data);
    return true;
  } catch (err) {
    console.error("Brevo email send error:", err.response?.data || err.message);
    return false;
  }
}

module.exports = sendEmail;