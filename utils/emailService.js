const nodemailer = require("nodemailer");
const pool = require("../config/db");

async function getSMTPSettings() {
  const [rows] = await pool.query(
    "SELECT setting_key, value FROM app_settings WHERE setting_key LIKE 'smtp_%' OR setting_key='email_enabled'",
  );

  const settings = {};

  rows.forEach((r) => {
    settings[r.setting_key] = r.value;
  });

  return settings;
}

async function sendEmail(to, subject, html) {
  try {
    const settings = await getSMTPSettings();

    if (settings.email_enabled !== "true") {
      return;
    }


    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: Number(settings.smtp_port),
      secure: false, // for port 587
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password,
      },
    });

    // verify connection
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${settings.smtp_from_name}" <${settings.smtp_from_email}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
  }
}

module.exports = { sendEmail };
