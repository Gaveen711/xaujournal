const stripe = require('stripe')(process.env.STRIPE_SECRET);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { origin, email, userId } = req.body;

  try {
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
            unit_amount: 2999,
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
    console.error('Stripe Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
