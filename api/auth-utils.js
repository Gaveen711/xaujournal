// api/auth-utils.js
// Consolidated: Login Alert emails + reCAPTCHA Enterprise assessment
// POST /api/auth-utils?action=login-alert   → send security email
// POST /api/auth-utils?action=recaptcha     → assess reCAPTCHA token

import { admin } from './_firebase.js';
import resend from './_resend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.query;

  // ── Login Alert ─────────────────────────────────────────────────────────────
  if (action === 'login-alert') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorised' });

      const token = authHeader.split('Bearer ')[1];
      const decoded = await admin.auth().verifyIdToken(token);
      const email = decoded.email;
      if (!email) return res.status(400).json({ error: 'Email not found' });

      await resend.emails.send({
        from: 'xaujournal <security@xaujournal.com>',
        to: email,
        subject: 'Security Alert: New Login Detected',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #0d0d14; color: #ffffff; border-radius: 24px; border: 1px solid #ffffff10;">
            <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 8px; color: #facc15;">SECURITY ALERT</h1>
            <p style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 32px;">New Terminal Access Detected</p>
            <p style="font-size: 16px; line-height: 1.6; color: #ffffff;">We detected a new sign-in to your xaujournal account.</p>
            <div style="margin: 32px 0; padding: 24px; background: #1a1a24; border-radius: 16px; border: 1px solid #ffffff05;">
              <p style="margin: 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Access Details</p>
              <p style="margin: 4px 0; font-size: 13px; color: #ffffff;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #ffffff;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">If this was you, you can safely ignore this message. If you do not recognise this activity, please reset your password immediately.</p>
            <p style="margin-top: 40px; font-size: 12px; color: #475569; border-top: 1px solid #ffffff10; padding-top: 20px;">SECURED BY XAUJOURNAL INFRASTRUCTURE.</p>
          </div>
        `
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Login Alert Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── reCAPTCHA Assessment ─────────────────────────────────────────────────────
  if (action === 'recaptcha') {
    const { token, recaptchaAction } = req.body;
    if (!token) return res.status(400).json({ valid: true, score: null }); // Fail open if no token

    try {
      const response = await fetch(
        `https://recaptchaenterprise.googleapis.com/v1/projects/myjournal-bfeca/assessments?key=${process.env.RECAPTCHA_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: { token, siteKey: '6LfSRMosAAAAAJkpsSHRweUx48z1amorEE2Abqe7', expectedAction: recaptchaAction }
          })
        }
      );

      const data = await response.json();
      const score = data?.riskAnalysis?.score ?? 1;
      const valid = data?.tokenProperties?.valid ?? true;
      const blocked = valid && score < 0.5;

      console.log(`reCAPTCHA: action=${recaptchaAction}, score=${score}, valid=${valid}`);
      return res.status(200).json({ valid, score, blocked });
    } catch (err) {
      console.error('reCAPTCHA assessment error:', err);
      return res.status(200).json({ valid: true, score: null, blocked: false }); // Fail open
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}
