"use strict";

const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

/** Nodemailer transporter singleton */
let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      secure: env.MAIL_PORT === 465,
      auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PASS,
      },
    });
  }
  return _transporter;
}

/**
 * Gửi email thiết lập tài khoản lần đầu
 * @param {{ to: string; fullName: string; setupUrl: string }} params
 */
async function sendAccountSetupEmail({ to, fullName, setupUrl }) {
  await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "🎉 Chào mừng bạn đến với Innovision — Thiết lập tài khoản",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Xin chào ${fullName},</h2>
        <p>Tài khoản của bạn tại hệ thống Innovision đã được tạo.</p>
        <p>Vui lòng nhấn nút bên dưới để thiết lập mật khẩu và kích hoạt tài khoản:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Thiết lập tài khoản
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Link này có hiệu lực trong <strong>24 giờ</strong>.<br>
          Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">Innovision HR System</p>
      </div>
    `,
  });
}

/**
 * Gửi email đặt lại mật khẩu
 * @param {{ to: string; fullName: string; resetUrl: string }} params
 */
async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "🔐 Yêu cầu đặt lại mật khẩu — Innovision",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Đặt lại mật khẩu</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #dc2626; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Đặt lại mật khẩu
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Link này có hiệu lực trong <strong>${env.AUTH_TOKEN_EXPIRES_HOURS} giờ</strong>.<br>
          Nếu bạn không yêu cầu điều này, tài khoản của bạn vẫn an toàn — hãy bỏ qua email này.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">Innovision HR System</p>
      </div>
    `,
  });
}

module.exports = { sendAccountSetupEmail, sendPasswordResetEmail };
