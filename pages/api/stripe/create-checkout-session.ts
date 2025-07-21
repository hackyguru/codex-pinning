import Stripe from 'stripe';
import { supabaseServer } from '../../../lib/supabase-server';
import { UserService } from '../../../lib/userService';
import { withAuth } from '../../../lib/auth';
import { getPlan } from '../../../lib/plans';

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

    // IMPORTANT: Check for existing Stripe subscriptions to prevent duplicates
    const { data: existingDbSubscription } = await supabaseServer
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    // If user has a Stripe customer ID, check for existing subscriptions
    if (existingDbSubscription?.stripe_customer_id) {
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: existingDbSubscription.stripe_customer_id,
        status: 'active',
        limit: 10
      });

      // If there are active subscriptions, handle them
      if (existingSubscriptions.data.length > 0) {
        console.log(`Found ${existingSubscriptions.data.length} existing active subscriptions for user ${userId}`);
        
        // Cancel all existing subscriptions to prevent duplicates
        for (const sub of existingSubscriptions.data) {
          await stripe.subscriptions.cancel(sub.id);
          console.log(`Canceled existing subscription ${sub.id} to prevent duplicate`);
        }
      }
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
      } catch (error: unknown) {
        if (error instanceof Error) {
          return res.status(400).json({ error: 'Invalid coupon code' });
        }
      }
    }

    // Get or create Stripe customer (reuse existingDbSubscription from above)
    let customer;
    if (existingDbSubscription?.stripe_customer_id) {
      customer = await stripe.customers.retrieve(existingDbSubscription.stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
    }

    // Get plan configuration
    const proPlan = getPlan('pro');

    // Prepare checkout session configuration
    const sessionConfig: Record<string, unknown> = {
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: proPlan.stripePriceData!.currency,
            product_data: {
              name: proPlan.stripePriceData!.productName,
              description: proPlan.stripePriceData!.productDescription,
            },
            unit_amount: proPlan.price.monthly,
            recurring: {
              interval: proPlan.stripePriceData!.interval,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
        planType: proPlan.id,
      },
      success_url: `${req.headers.origin}/dashboard?upgraded=true`,
      cancel_url: `${req.headers.origin}/dashboard?upgrade=cancelled`,
    };

    // Apply coupon if validated, otherwise allow manual promo codes
    if (validatedCoupon) {
      sessionConfig.discounts = [{
        coupon: validatedCoupon
      }];
    } else {
      sessionConfig.allow_promotion_codes = true; // Allows manual entry of promo codes in Stripe checkout
    }

    // Create checkout session
    console.log('Creating Stripe checkout session with config:', {
      customer: sessionConfig.customer,
      couponApplied: !!validatedCoupon,
      allowPromoCodes: !validatedCoupon
    });

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Checkout session created successfully: ${session.id}`);

    res.status(200).json({ 
      sessionUrl: session.url,
      couponApplied: validatedCoupon ? true : false,
      couponCode: validatedCoupon
    });
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if ((error as any).type === 'StripeInvalidRequestError') {
        return res.status(400).json({ 
          error: 'Invalid checkout configuration. Please try again or contact support.',
          details: error.message 
        });
      }
    }
    
    res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
  }
});

export default createCheckoutHandler; 