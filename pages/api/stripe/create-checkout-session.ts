import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseServer } from '../../../lib/supabase-server';
import { UserService } from '../../../lib/userService';
import { withAuth } from '../../../lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const createCheckoutHandler = withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use authenticated user's data - NO user input accepted!
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Extract coupon code from request body (optional)
    const { couponCode } = req.body || {};

    // Check if user already has an active pro subscription using our unified method
    const currentPlan = await UserService.getUserPlan(userId);
    
    if (currentPlan === 'pro' || currentPlan === 'enterprise') {
      return res.status(400).json({ error: `User already has an active ${currentPlan} subscription` });
    }

    // Validate coupon code if provided
    let validatedCoupon = null;
    if (couponCode && typeof couponCode === 'string') {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon && coupon.valid) {
          validatedCoupon = couponCode;
        } else {
          return res.status(400).json({ error: 'Invalid or expired coupon code' });
        }
      } catch (couponError) {
        return res.status(400).json({ error: 'Invalid coupon code' });
      }
    }

    // Get or create Stripe customer
    let customer;
    const { data: existingSubscription } = await supabaseServer
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      customer = await stripe.customers.retrieve(existingSubscription.stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
    }

    // Prepare checkout session configuration
    const sessionConfig: any = {
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ThirdStorage Pro Plan',
              description: '50MB storage limit with advanced features',
            },
            unit_amount: 1000, // $10.00 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
        planType: 'pro',
      },
      success_url: `${req.headers.origin}/dashboard?upgraded=true`,
      cancel_url: `${req.headers.origin}/dashboard?upgrade=cancelled`,
      allow_promotion_codes: true, // Allows manual entry of promo codes in Stripe checkout
    };

    // Apply coupon if validated
    if (validatedCoupon) {
      sessionConfig.discounts = [{
        coupon: validatedCoupon
      }];
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({ 
      sessionUrl: session.url,
      couponApplied: validatedCoupon ? true : false,
      couponCode: validatedCoupon
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

export default createCheckoutHandler; 