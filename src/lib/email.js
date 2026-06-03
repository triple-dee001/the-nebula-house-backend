// Brevo HTTP API — no SDK, plain fetch
const BASE_URL = process.env.FRONTEND_URL || 'https://the-nebula-house-website.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://the-nebula-house-backend-production-8bb3.up.railway.app';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'danieldurojaiye42@gmail.com';
const SENDER_NAME = 'The Nebula House';

async function sendEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not set — skipping email to', to);
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Brevo send error:', err);
    throw new Error(err.message || 'Failed to send email');
  }
  return res.json();
}

async function sendVerificationEmail(email, name, token) {
  const link = `${BACKEND_URL}/api/auth/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your Nebula House account',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="font-size:1.75rem;margin-bottom:0.5rem;">Welcome to The Nebula House</h2>
        <p style="color:#aaa;margin-bottom:1.5rem;">Hi ${name}, please verify your email to activate your account.</p>
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;">Verify Email</a>
        <p style="color:#666;font-size:0.8rem;margin-top:1.5rem;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, name, token) {
  const link = `${BASE_URL}/reset-password.html?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset your Nebula House password',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="font-size:1.75rem;margin-bottom:0.5rem;">Password Reset</h2>
        <p style="color:#aaa;margin-bottom:1.5rem;">Hi ${name}, click below to reset your password.</p>
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
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
    ? `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="color:#4caf50;">Story Approved! 🎉</h2>
        <p style="color:#aaa;">Hi ${name}, your story <strong style="color:#fff;">"${title}"</strong> is now live in The Writer's Room.</p>
        <a href="${BASE_URL}/the-writers-room.html" style="display:inline-block;background:#fff;color:#000;padding:0.75rem 2rem;border-radius:6px;text-decoration:none;font-weight:600;margin-top:1rem;">View it live</a>
      </div>`
    : `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2rem;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="color:#ef4444;">Story Not Approved</h2>
        <p style="color:#aaa;">Hi ${name}, your story <strong style="color:#fff;">"${title}"</strong> was not approved at this time.</p>
        ${reason ? `<p style="color:#aaa;">Reason: <em>${reason}</em></p>` : ''}
        <p style="color:#aaa;">You're welcome to revise and resubmit.</p>
      </div>`;
  await sendEmail({ to: email, subject, html });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendPostStatusEmail };
