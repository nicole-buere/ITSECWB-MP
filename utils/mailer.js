// utils/mailer.js
require('dotenv').config();

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.MAIL_FROM || 'Labyrinth <onboarding@resend.dev>';

if (!apiKey) {
  console.warn('[mailer] RESEND_API_KEY missing. Emails will NOT be sent.');
}

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * sendMail({ to, subject, html, text? })
 */
async function sendMail({ to, subject, html, text }) {
  if (!resend) {
    console.log('[mailer] Skipping send (no RESEND_API_KEY). Would send to:', to);
    return { skipped: true };
  }

  const res = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  // Helpful log
  console.log('[mailer] Resend response:', res?.data || res);
  return res;
}

module.exports = { sendMail };
