import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { withAuth } from '../../../lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const validateCouponHandler = withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { couponCode } = req.body;

    if (!couponCode || typeof couponCode !== 'string') {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    // Validate coupon with Stripe
    const coupon = await stripe.coupons.retrieve(couponCode);

    if (!coupon || !coupon.valid) {
      return res.status(400).json({ 
        error: 'Invalid or expired coupon code',
        valid: false 
      });
    }

    // Calculate discount information
    const discountInfo = {
      valid: true,
      couponId: coupon.id,
      name: coupon.name,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      currency: coupon.currency,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      maxRedemptions: coupon.max_redemptions,
      timesRedeemed: coupon.times_redeemed,
      redeemBy: coupon.redeem_by,
    };

    // Calculate actual discount on $10 Pro plan
    let discountAmount = 0;
    let finalPrice = 1000; // $10.00 in cents

    if (coupon.percent_off) {
      discountAmount = Math.round((1000 * coupon.percent_off) / 100);
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off;
    }

    finalPrice = Math.max(0, 1000 - discountAmount);

    return res.status(200).json({
      ...discountInfo,
      originalPrice: 1000,
      discountAmount,
      finalPrice,
      formattedOriginalPrice: '$10.00',
      formattedDiscountAmount: `$${(discountAmount / 100).toFixed(2)}`,
      formattedFinalPrice: `$${(finalPrice / 100).toFixed(2)}`,
    });

  } catch (error: any) {
    console.error('Error validating coupon:', error);
    
    if (error.code === 'resource_missing') {
      return res.status(400).json({ 
        error: 'Coupon code not found',
        valid: false 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to validate coupon code',
      valid: false 
    });
  }
});

export default validateCouponHandler; 