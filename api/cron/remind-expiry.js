import { Resend } from 'resend';
import { timingSafeEqual } from 'crypto';
import { admin, db } from '../_firebase.js';


const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // 1. Verify the Secret (Hardened against Timing Attacks)
  const providedAuth = req.headers.authorization || '';
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  const providedBuffer = Buffer.from(providedAuth);
  const expectedBuffer = Buffer.from(expectedAuth);

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    // Logic: 3 days before expiry
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    // Logic: 1 day before expiry (Final warning)
    const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('plan', '==', 'pro').get();

    const emailPromises = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.planExpiry || !data.email) return;

      const expiryDate = new Date(data.planExpiry);

      // Check for 3-day reminder window
      if (expiryDate <= threeDaysFromNow && expiryDate > new Date(threeDaysFromNow.getTime() - 86400000)) {
        emailPromises.push(
          resend.emails.send({
            from: 'XAU Journal <alerts@xaujournal.vercel.app/>', // Ensure goldjournal.app is verified in Resend dashboard
            to: data.email,
            subject: 'XAU Journal: 3 Days Left of Pro',
            html: `<p>Hi ${data.name || 'Trader'}, your Pro access expires in 3 days. Renew now to avoid losing your advanced analytics.</p>`
          })
        );
      }
    });

    await Promise.all(emailPromises);
    return res.status(200).json({ success: true, sent: emailPromises.length });

  } catch (error) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: error.message });
  }
}