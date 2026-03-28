/**
 * services/emailService.js
 * Nodemailer / Gmail SMTP — Premium SaaS Templates
 */

const nodemailer = require("nodemailer");

// ── Shared Email Styles ──────────────────────────────────────────
const BRAND_BLUE = "#3b82f6";
const BG_GRAY = "#f9fafb";
const TEXT_DARK = "#1f2937";
const TEXT_LIGHT = "#4b5563";
const BORDER_COLOR = "#e5e7eb";

const BASE_HEAD = `
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  </head>
`;

// ── Reusable transporter ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

const FROM = `TeleCloud <${process.env.EMAIL_USER}>`;

// ── Welcome Email ─────────────────────────────────────────────────
exports.sendWelcomeEmail = async (email, name) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[email] EMAIL_USER / EMAIL_PASS not set. Skipping welcome email to", email);
    return;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
        ${BASE_HEAD}
        <body style="margin:0;padding:0;background-color:${BG_GRAY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 20px">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
                  <tr>
                    <td style="padding:40px 40px 20px 40px">
                      <h1 style="margin:0;color:${BRAND_BLUE};font-size:24px;font-weight:800;letter-spacing:-0.025em">TeleCloud</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 40px 40px 40px">
                      <h2 style="margin:0 0 16px 0;color:${TEXT_DARK};font-size:20px;font-weight:700">Welcome to the future of storage! 🚀</h2>
                      <p style="margin:0 0 24px 0;color:${TEXT_LIGHT};font-size:16px;line-height:24px">Hi ${name || "there"},</p>
                      <p style="margin:0 0 24px 0;color:${TEXT_LIGHT};font-size:16px;line-height:24px">We're thrilled to have you! You now have a high-performance cloud storage solution that uses Telegram's infinite infrastructure to keep your data safe, secure, and accessible from anywhere.</p>
                      <div style="padding:24px;background-color:#f8fafc;border-radius:8px;margin-bottom:24px;border:1px solid #f1f5f9">
                        <p style="margin:0;color:${TEXT_DARK};font-size:14px;font-weight:600">What's next?</p>
                        <p style="margin:4px 0 0 0;color:${TEXT_LIGHT};font-size:14px">Upload your first file and see how fast it works.</p>
                      </div>
                      <a href="https://telecloud-tau.vercel.app" style="display:inline-block;background-color:${BRAND_BLUE};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:16px">Go to Dashboard</a>
                    </td>
                  </tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;margin-top:20px;text-align:center">
                  <tr>
                    <td style="color:#9ca3af;font-size:12px">
                      <p style="margin:0">&copy; 2026 TeleCloud Inc. All rights reserved.</p>
                      <p style="margin:4px 0 0 0">Secure Cloud Storage powered by Telegram infrastructure.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: FROM,
      to: email,
      subject: "Welcome to TeleCloud 🚀",
      html,
    });
    console.log("[email] Welcome email sent to", email, "| msgId:", info.messageId);
  } catch (err) {
    console.error("[email] Failed to send welcome email to", email, err.message);
  }
};

// ── Subscription Activated Email ──────────────────────────────────
exports.sendSubscriptionEmail = async (email, name, planName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[email] EMAIL_USER / EMAIL_PASS not set. Skipping subscription email to", email);
    return;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
        ${BASE_HEAD}
        <body style="margin:0;padding:0;background-color:${BG_GRAY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 20px">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
                  <tr>
                    <td style="padding:40px 40px 20px 40px">
                      <h1 style="margin:0;color:${BRAND_BLUE};font-size:24px;font-weight:800;letter-spacing:-0.025em">TeleCloud</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 40px 40px 40px">
                      <h2 style="margin:0 0 16px 0;color:${TEXT_DARK};font-size:20px;font-weight:700">Subscription Activated! 🎉</h2>
                      <p style="margin:0 0 24px 0;color:${TEXT_LIGHT};font-size:16px;line-height:24px">Hi ${name || "there"},</p>
                      <p style="margin:0 0 24px 0;color:${TEXT_LIGHT};font-size:16px;line-height:24px">Your subscription has been successfully activated. You now have full access to high-performance storage with absolutely zero limits.</p>
                      <div style="padding:24px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;text-align:center">
                        <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700">Current Plan</p>
                        <p style="margin:8px 0 0 0;color:${BRAND_BLUE};font-size:28px;font-weight:800">${planName}</p>
                      </div>
                      <p style="margin:0 0 24px 0;color:${TEXT_LIGHT};font-size:15px;line-height:24px">Your data is safe, secure, and always accessible. Even if your plan expires, your files will stay protected in your account.</p>
                      <a href="https://telecloud-tau.vercel.app" style="display:inline-block;background-color:${BRAND_BLUE};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:16px">Go to Dashboard</a>
                    </td>
                  </tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;margin-top:20px;text-align:center">
                  <tr>
                    <td style="color:#9ca3af;font-size:12px">
                      <p style="margin:0">&copy; 2026 TeleCloud Inc. All rights reserved.</p>
                      <p style="margin:4px 0 0 0">TeleCloud helps you store and share large files using MTProto infrastructure.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: FROM,
      to: email,
      subject: "Subscription Activated 🎉",
      html,
    });
    console.log("[email] Subscription email sent to", email, "| msgId:", info.messageId);
  } catch (err) {
    console.error("[email] Failed to send subscription email to", email, err.message);
  }
};
