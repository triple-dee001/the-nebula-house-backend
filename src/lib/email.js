const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM = process.env.SMTP_FROM || 'The Nebula House <noreply@thenebulahouse.com>';

async function sendVerificationEmail(email, name, token) {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your Nebula House account',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="font-family:serif;font-size:1.75rem;margin-bottom:0.5rem;">Welcome to The Nebula House</h2>
        <p style="color:#aaa;margin-bottom:1.5rem;">Hi ${name}, please verify your email to activate your account.</p>
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;font-family:sans-serif;">Verify Email</a>
        <p style="color:#666;font-size:0.8rem;margin-top:1.5rem;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, name, token) {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your Nebula House password',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="font-family:serif;font-size:1.75rem;margin-bottom:0.5rem;">Password Reset</h2>
        <p style="color:#aaa;margin-bottom:1.5rem;">Hi ${name}, click below to reset your password.</p>
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;font-family:sans-serif;">Reset Password</a>
        <p style="color:#666;font-size:0.8rem;margin-top:1.5rem;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

async function sendPostStatusEmail(email, name, title, status, reason) {
  const subject = status === 'PUBLISHED'
    ? `Your story "${title}" has been approved!`
    : `Update on your story "${title}"`;
  const html = status === 'PUBLISHED'
    ? `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="color:#4caf50;">Story Approved! 🎉</h2>
        <p style="color:#aaa;">Hi ${name}, your story <strong style="color:#fff;">"${title}"</strong> has been approved and is now live in The Writer's Room.</p>
        <a href="${BASE_URL}/the-writers-room.html" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;font-family:sans-serif;margin-top:1rem;">View it live</a>
      </div>`
    : `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="color:#ef4444;">Story Not Approved</h2>
        <p style="color:#aaa;">Hi ${name}, your story <strong style="color:#fff;">"${title}"</strong> was not approved at this time.</p>
        ${reason ? `<p style="color:#aaa;">Reason: <em>${reason}</em></p>` : ''}
        <p style="color:#aaa;">You're welcome to revise and resubmit.</p>
      </div>`;
  await transporter.sendMail({ from: FROM, to: email, subject, html });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendPostStatusEmail };
