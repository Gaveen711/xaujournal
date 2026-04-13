import Stripe from 'stripe';

export default async function handler(req, res) {
  // 1. Health Check
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'API is active' });
  }

  // 2. Method Check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. Secret Key Check
  const STRIPE_SECRET = process.env.STRIPE_SECRET;
  if (!STRIPE_SECRET || STRIPE_SECRET.startsWith('sk_test_...')) {
    return res.status(500).json({ 
      error: "Configuration Error: STRIPE_SECRET is missing in Vercel. Please add it to your project settings." 
    });
  }

  const stripe = new Stripe(STRIPE_SECRET);

  // 3. Body Validation
  const { origin, email, userId } = req.body;
  if (!email || !userId || !origin) {
    return res.status(400).json({ 
      error: `Missing parameters: ${!email ? 'email ' : ''}${!userId ? 'userId ' : ''}${!origin ? 'origin' : ''}` 
    });
  }

  try {
    // 4. Create Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Pro Subscription',
              description: 'Access to all Pro features for 1 month',
            },
            unit_amount: 2999, // $29.99
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout-success`,
      cancel_url: `${origin}/checkout-cancel`,
      metadata: {
        userId: userId,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('CRITICAL STRIPE ERROR:', error);
    return res.status(500).json({ 
      error: `Stripe checkout failed: ${error.message}` 
    });
  }
}
