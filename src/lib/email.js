// Brevo HTTP API — no SDK, plain fetch
const BASE_URL = process.env.FRONTEND_URL || 'https://thenebulahouse.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://the-nebula-house-backend.onrender.com';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'kelechioji@thenebulahouse.com';
const SENDER_NAME = 'The Nebula House';
const LOGO_URL = 'https://thenebulahouse.com/assets/images/room-icon.png';

async function sendEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.log('\n┌──────────────── MOCK EMAIL SENT ────────────────┐');
    console.log(`│ TO:      ${to}`);
    console.log(`│ SUBJECT: ${subject}`);
    const hrefMatch = html.match(/href="([^"]+)"/);
    if (hrefMatch) {
      console.log(`│ LINK:    ${hrefMatch[1]}`);
    }
    console.log('└─────────────────────────────────────────────────┘\n');
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
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2.5rem 2rem;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 20px rgba(0,0,0,0.6);">
        <div style="text-align:center;margin-bottom:2rem;">
          <img src="${LOGO_URL}" alt="The Nebula House Logo" style="height:60px;margin-bottom:1rem;display:inline-block;">
          <h2 style="font-size:1.75rem;margin:0;font-family:Georgia,serif;color:#fff;font-weight:normal;">Welcome to The Nebula House</h2>
        </div>
        <p style="color:#ddd;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Hi ${name},</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Please verify your email to activate your account and start writing.</p>
        <div style="text-align:center;margin:2rem 0;">
          <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.8rem 2.2rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">Verify Email</a>
        </div>
        <p style="color:#666;font-size:0.8rem;margin-top:2rem;text-align:center;line-height:1.4;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:2rem 0 1rem;">
        <p style="color:#555;font-size:0.75rem;text-align:center;margin:0;">&copy; 2026 The Nebula House. All Rights Reserved.</p>
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
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2.5rem 2rem;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 20px rgba(0,0,0,0.6);">
        <div style="text-align:center;margin-bottom:2rem;">
          <img src="${LOGO_URL}" alt="The Nebula House Logo" style="height:60px;margin-bottom:1rem;display:inline-block;">
          <h2 style="font-size:1.75rem;margin:0;font-family:Georgia,serif;color:#fff;font-weight:normal;">Password Reset</h2>
        </div>
        <p style="color:#ddd;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Hi ${name},</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Click the button below to reset your password.</p>
        <div style="text-align:center;margin:2rem 0;">
          <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:0.8rem 2.2rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">Reset Password</a>
        </div>
        <p style="color:#666;font-size:0.8rem;margin-top:2rem;text-align:center;line-height:1.4;">This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:2rem 0 1rem;">
        <p style="color:#555;font-size:0.75rem;text-align:center;margin:0;">&copy; 2026 The Nebula House. All Rights Reserved.</p>
      </div>
    `,
  });
}

async function sendPostStatusEmail(email, name, title, status, reason) {
  const subject = status === 'PUBLISHED'
    ? `Your story "${title}" has been approved!`
    : `Update on your story "${title}"`;
  const html = status === 'PUBLISHED'
    ? `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2.5rem 2rem;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 20px rgba(0,0,0,0.6);">
        <div style="text-align:center;margin-bottom:2rem;">
          <img src="${LOGO_URL}" alt="The Nebula House Logo" style="height:60px;margin-bottom:1rem;display:inline-block;">
          <h2 style="font-size:1.75rem;margin:0;font-family:Georgia,serif;color:#4ade80;font-weight:normal;">Story Approved! 🎉</h2>
        </div>
        <p style="color:#ddd;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Hi ${name},</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Your story <strong style="color:#fff;">"${title}"</strong> is now live in The Writer's Room.</p>
        <div style="text-align:center;margin:2rem 0;">
          <a href="${BASE_URL}/the-writers-room.html" style="display:inline-block;background:#fff;color:#000;padding:0.8rem 2.2rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">View live feed</a>
        </div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:2rem 0 1rem;">
        <p style="color:#555;font-size:0.75rem;text-align:center;margin:0;">&copy; 2026 The Nebula House. All Rights Reserved.</p>
      </div>`
    : `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2.5rem 2rem;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 20px rgba(0,0,0,0.6);">
        <div style="text-align:center;margin-bottom:2rem;">
          <img src="${LOGO_URL}" alt="The Nebula House Logo" style="height:60px;margin-bottom:1rem;display:inline-block;">
          <h2 style="font-size:1.75rem;margin:0;font-family:Georgia,serif;color:#f87171;font-weight:normal;">Story Review Update</h2>
        </div>
        <p style="color:#ddd;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Hi ${name},</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Your story <strong style="color:#fff;">"${title}"</strong> was not approved at this time.</p>
        ${reason ? `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:1rem;margin-bottom:1.5rem;color:#fca5a5;font-style:italic;">"${reason}"</div>` : ''}
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">You are welcome to revise and resubmit your draft from your profile anytime.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:2rem 0 1rem;">
        <p style="color:#555;font-size:0.75rem;text-align:center;margin:0;">&copy; 2026 The Nebula House. All Rights Reserved.</p>
      </div>`;
  await sendEmail({ to: email, subject, html });
}

async function sendSubscriptionWelcomeEmail(email, name) {
  await sendEmail({
    to: email,
    subject: 'Welcome to The Nebula House!',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2.5rem 2rem;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 20px rgba(0,0,0,0.6);">
        <div style="text-align:center;margin-bottom:2rem;">
          <img src="${LOGO_URL}" alt="The Nebula House Logo" style="height:60px;margin-bottom:1rem;display:inline-block;">
          <h2 style="font-size:1.75rem;margin:0;font-family:Georgia,serif;color:#fff;font-weight:normal;">Welcome to The Nebula House</h2>
        </div>
        <p style="color:#ddd;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Hi ${name || 'there'},</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Welcome to The Nebula House. You have successfully subscribed to our newsletter!</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Prepare to receive personal essays, book club recommendations, creative insights, and stories delivered straight to your inbox.</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">From Imagination to Infinity.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:2rem 0 1rem;">
        <p style="color:#555;font-size:0.75rem;text-align:center;margin:0;">&copy; 2026 The Nebula House. All Rights Reserved.</p>
      </div>
    `,
  });
}

async function sendWriterWelcomeEmail(email, name) {
  await sendEmail({
    to: email,
    subject: 'Welcome to The Nebula House — Writer Account Active!',
    html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:2.5rem 2rem;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 20px rgba(0,0,0,0.6);">
        <div style="text-align:center;margin-bottom:2rem;">
          <img src="${LOGO_URL}" alt="The Nebula House Logo" style="height:60px;margin-bottom:1rem;display:inline-block;">
          <h2 style="font-size:1.75rem;margin:0;font-family:Georgia,serif;color:#fff;font-weight:normal;">Welcome to The Writer's Room</h2>
        </div>
        <p style="color:#ddd;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Hi ${name},</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">Your account at The Nebula House is now verified and active!</p>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">You are now part of our digital literary ecosystem. As a registered writer, you can draft, edit, and publish your own stories directly inside The Writer's Room.</p>
        <div style="text-align:center;margin:2rem 0;">
          <a href="${BASE_URL}/write.html" style="display:inline-block;background:#fff;color:#000;padding:0.8rem 2.2rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">Start Writing Your Story</a>
        </div>
        <p style="color:#aaa;font-size:1rem;line-height:1.6;margin-bottom:1.5rem;">We can't wait to read what you create.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:2rem 0 1rem;">
        <p style="color:#555;font-size:0.75rem;text-align:center;margin:0;">&copy; 2026 The Nebula House. All Rights Reserved.</p>
      </div>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPostStatusEmail,
  sendSubscriptionWelcomeEmail,
  sendWriterWelcomeEmail,
};

