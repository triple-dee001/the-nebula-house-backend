// Brevo HTTP API — no SDK, plain fetch
const BASE_URL = process.env.FRONTEND_URL || 'https://thenebulahouse.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://the-nebula-house-backend.onrender.com';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'kelechioji@thenebulahouse.com';
const SENDER_NAME = 'The Nebula House';
const LOGO_URL = 'https://thenebulahouse.com/assets/images/room-icon.png';
const BG_URL = 'https://thenebulahouse.com/assets/images/library-bg.jpg';

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

async function sendTemplateEmail({ to, templateId, params = {} }) {
  if (!process.env.BREVO_API_KEY) {
    console.log('\n┌───────────── MOCK TEMPLATE EMAIL SENT ─────────────┐');
    console.log(`│ TO:          ${to}`);
    console.log(`│ TEMPLATE ID: ${templateId}`);
    console.log(`│ PARAMS:      ${JSON.stringify(params)}`);
    console.log('└────────────────────────────────────────────────────┘\n');
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
      to: [{ email: to }],
      templateId: parseInt(templateId),
      params,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Brevo template send error:', err);
    throw new Error(err.message || 'Failed to send template email');
  }
  return res.json();
}

// ─── EMAIL TEMPLATE WRAPPER ───────────────────
function wrapTemplate(headerTitle, bodyHtml) {
  return `
    <div style="font-family: Georgia, serif; background-image: url('${BG_URL}'); background-size: cover; background-position: center; background-repeat: no-repeat; padding: 3rem 1rem; background-color: #0c0c0c;">
      <div style="max-width: 540px; margin: 0 auto; background: #0c0c0c; color: #ffffff; border: 4px double #ffffff; padding: 2.5rem 2rem; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.85);">
        <div style="text-align: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 1.5rem;">
          <img src="${LOGO_URL}" alt="The Nebula House Logo" style="height: 55px; margin-bottom: 0.75rem; display: inline-block;">
          <h2 style="font-size: 1.4rem; font-weight: normal; letter-spacing: 2px; margin: 0; text-transform: uppercase; color: #ffffff; font-family: Georgia, serif;">${headerTitle}</h2>
        </div>
        <div style="line-height: 1.75; font-size: 1rem; color: #e2e2e2; font-family: Georgia, serif;">
          ${bodyHtml}
        </div>
        <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.15); text-align: center; font-size: 0.72rem; color: #777; letter-spacing: 1.5px; font-family: Georgia, serif;">
          &copy; 2026 THE NEBULA HOUSE. ALL RIGHTS RESERVED.
        </div>
      </div>
    </div>
  `;
}

// ─── EXPORTED SENDER FUNCTIONS ─────────────────

async function sendVerificationEmail(email, name, token) {
  const link = `${BACKEND_URL}/api/auth/verify-email?token=${token}`;
  const html = wrapTemplate('Account Verification', `
    <p>Dear ${name},</p>
    <p>Thank you for registering at The Nebula House.</p>
    <p>To activate your account and gain access to the writer panel and curriculum, please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 2.5rem 0;">
      <a href="${link}" style="display: inline-block; background: #ffffff; color: #000000; padding: 0.85rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase;">Verify Email</a>
    </div>
    <p style="font-size: 0.82rem; color: #888; line-height: 1.5; margin-top: 2rem;">This link will expire in 24 hours. If you did not register for an account, you can safely ignore this communication.</p>
  `);
  
  await sendEmail({
    to: email,
    subject: 'Verify your Nebula House account',
    html,
  });
}

async function sendPasswordResetEmail(email, name, token) {
  const link = `${BASE_URL}/reset-password.html?token=${token}`;
  const html = wrapTemplate('Password Recovery', `
    <p>Dear ${name},</p>
    <p>We received a request to reset the password for your Nebula House account.</p>
    <p>Please click the button below to establish a new password:</p>
    <div style="text-align: center; margin: 2.5rem 0;">
      <a href="${link}" style="display: inline-block; background: #ffffff; color: #000000; padding: 0.85rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase;">Reset Password</a>
    </div>
    <p style="font-size: 0.82rem; color: #888; line-height: 1.5; margin-top: 2rem;">This link will expire in 1 hour. If you did not request this change, your password will remain secure and no action is required.</p>
  `);

  await sendEmail({
    to: email,
    subject: 'Reset your Nebula House password',
    html,
  });
}

async function sendPostStatusEmail(email, name, title, status, reason) {
  const isApproved = status === 'PUBLISHED';
  const subject = isApproved
    ? `Your story "${title}" has been approved!`
    : `Update on your story "${title}"`;

  let bodyContent = '';
  if (isApproved) {
    bodyContent = `
      <p>Dear ${name},</p>
      <p>We are pleased to inform you that your story <strong style="color: #ffffff;">"${title}"</strong> has been approved and is now live in The Writer's Room.</p>
      <div style="text-align: center; margin: 2.5rem 0;">
        <a href="${BASE_URL}/the-writers-room.html" style="display: inline-block; background: #ffffff; color: #000000; padding: 0.85rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase;">View Live Feed</a>
      </div>
    `;
  } else {
    bodyContent = `
      <p>Dear ${name},</p>
      <p>Thank you for submitting your story <strong style="color: #ffffff;">"${title}"</strong> to The Writer's Room.</p>
      <p>Our editorial team has reviewed your draft. At this time, it has not been approved for publication.</p>
      ${reason ? `<div style="background: rgba(255,255,255,0.03); border-left: 3px solid #ffffff; padding: 1rem 1.25rem; margin: 1.5rem 0; color: #dddddd; font-style: italic;">"${reason}"</div>` : ''}
      <p>You are welcome to revise and resubmit your draft from your writer profile at any time.</p>
    `;
  }

  const html = wrapTemplate('Editorial Status', bodyContent);
  await sendEmail({ to: email, subject, html });
}

async function sendSubscriptionWelcomeEmail(email, name) {
  // Use Brevo Transactional Template ID 2 for newsletter signups
  await sendTemplateEmail({
    to: email,
    templateId: 2,
    params: {
      name: name || 'Reader',
      FIRSTNAME: name || 'Reader',
      NAME: name || 'Reader'
    }
  });
}

async function sendWriterWelcomeEmail(email, name) {
  const html = wrapTemplate('The Writers Room', `
    <p>Dear ${name},</p>
    <p>Welcome to The Writer's Room at The Nebula House.</p>
    <p>Your writer account is now active. As a member of our creative community, you are equipped to draft, edit, and publish your own works within our literary ecosystem.</p>
    <div style="text-align: center; margin: 2.5rem 0;">
      <a href="${BASE_URL}/write.html" style="display: inline-block; background: #ffffff; color: #000000; padding: 0.85rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase;">Start Writing</a>
    </div>
    <p>We are honored to have your voice in the room, and we look forward to the stories you will bring to light.</p>
  `);

  await sendEmail({
    to: email,
    subject: 'Welcome to The Nebula House — Writer Account Active!',
    html,
  });
}

async function sendMentorshipRequestEmail(email, name, menteeName, messageText) {
  const html = wrapTemplate('Mentorship Request', `
    <p>Dear ${name},</p>
    <p>You have received a new mentorship request from <strong style="color: #ffffff;">${menteeName}</strong> in The Writer's Room.</p>
    <p>They left you the following message:</p>
    <div style="background: rgba(255,255,255,0.03); border-left: 3px solid #ffffff; padding: 1.25rem; margin: 1.5rem 0; color: #dddddd; font-style: italic; font-size: 0.95rem; line-height: 1.6;">
      "${messageText || 'No message provided.'}"
    </div>
    <p>Please log in to your account and navigate to The Writer's Room under "Author Mentorship" to accept or decline this request.</p>
    <div style="text-align: center; margin: 2.5rem 0;">
      <a href="${BASE_URL}/the-writers-room.html" style="display: inline-block; background: #ffffff; color: #000000; padding: 0.85rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase;">View Requests</a>
    </div>
  `);

  await sendEmail({
    to: email,
    subject: `New Mentorship Request from ${menteeName}`,
    html,
  });
}

async function sendFollowerNewPostEmail(email, name, authorName, postTitle, postSlug) {
  const postUrl = `${BASE_URL}/story/${postSlug}`;
  const html = wrapTemplate('New Story Alert', `
    <p>Dear ${name},</p>
    <p><strong style="color: #ffffff;">${authorName}</strong>, whom you follow at The Nebula House, has just published a brand new story: <strong style="color: #ffffff;">"${postTitle}"</strong>.</p>
    <div style="text-align: center; margin: 2.5rem 0;">
      <a href="${postUrl}" style="display: inline-block; background: #ffffff; color: #000000; padding: 0.85rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase;">Read Story</a>
    </div>
    <p>We hope you enjoy the read!</p>
  `);

  await sendEmail({
    to: email,
    subject: `New Story from ${authorName}: "${postTitle}"`,
    html,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPostStatusEmail,
  sendSubscriptionWelcomeEmail,
  sendWriterWelcomeEmail,
  sendMentorshipRequestEmail,
  sendFollowerNewPostEmail,
};
