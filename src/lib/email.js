const SibApiV3Sdk = require('@getbrevo/brevo');

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();

const FROM = {
  name: 'The Nebula House',
  email: process.env.BREVO_SENDER_EMAIL || 'danieldurojaiye42@gmail.com'
};

const BASE_URL = process.env.FRONTEND_URL || 'https://the-nebula-house-website.vercel.app';

async function sendEmail({ to, subject, html }) {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.sender = FROM;
  email.to = [{ email: to }];
  email.subject = subject;
  email.htmlContent = html;
  return transactionalApi.sendTransacEmail(email);
}

async function sendVerificationEmail(email, name, token) {
  const link = `${process.env.BACKEND_URL || 'https://the-nebula-house-backend-production-8bb3.up.railway.app'}/api/auth/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your Nebula House account',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="font-family:serif;font-size:1.75rem;margin-bottom:0.5rem;">Welcome to The Nebula House</h2>
        <p style="color:#aaa;margin-bottom:1.5rem;">Hi ${name}, please verify your email to activate your account.</p>
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;font-family:sans-serif;">Verify Email</a>
        <p style="color:#666;font-size:0.8rem;margin-top:1.5rem;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `
  });
}

async function sendPasswordResetEmail(email, name, token) {
  const link = `${BASE_URL}/reset-password.html?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset your Nebula House password',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="font-family:serif;font-size:1.75rem;margin-bottom:0.5rem;">Password Reset</h2>
        <p style="color:#aaa;margin-bottom:1.5rem;">Hi ${name}, click below to reset your password.</p>
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;font-family:sans-serif;">Reset Password</a>
        <p style="color:#666;font-size:0.8rem;margin-top:1.5rem;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `
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
        <p style="color:#aaa;">Hi ${name}, your story <strong style="color:#fff;">"${title}"</strong> is now live in The Writer's Room.</p>
        <a href="${BASE_URL}/the-writers-room.html" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;font-family:sans-serif;margin-top:1rem;">View it live</a>
      </div>`
    : `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="color:#ef4444;">Story Not Approved</h2>
        <p style="color:#aaa;">Hi ${name}, your story <strong style="color:#fff;">"${title}"</strong> was not approved at this time.</p>
        ${reason ? `<p style="color:#aaa;">Reason: <em>${reason}</em></p>` : ''}
        <p style="color:#aaa;">You're welcome to revise and resubmit.</p>
      </div>`;
  await sendEmail({ to: email, subject, html });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendPostStatusEmail };
