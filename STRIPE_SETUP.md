# Stripe Payment Integration Setup Guide

This guide will help you set up the complete payment system for ThirdStorage with three plans: Free (10MB), Pro (50MB), and Enterprise (custom).

## 📋 Overview

- **Free Plan**: 10MB storage, free forever
- **Pro Plan**: 50MB storage, $10/month via Stripe
- **Enterprise Plan**: Custom storage limit, manual billing

## 🔧 Required Environment Variables

Add these to your `.env.local` file:

```bash
# Existing variables...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# New Stripe variables
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 🏗️ Database Setup

1. **Run the updated schema** in your Supabase SQL Editor:
   ```bash
   # The updated schema is in supabase-complete-schema.sql
   # It includes new tables: subscriptions, billing_history
   ```

2. **Key changes**:
   - Added `enterprise` plan type
   - Added `storage_limit` column with automatic limits:
     - Free: 10MB (10,485,760 bytes)
     - Pro: 50MB (52,428,800 bytes)
     - Enterprise: Custom (manually set)
   - New subscription tracking
   - Billing history tracking

## 🎯 Stripe Configuration

### 1. Create Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create account or sign in
3. Get your API keys from the Developers section

### 2. Set Up Webhook Endpoint
1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret

### 3. Test the Integration
1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires authentication: `4000 0000 0000 3220`
2. Test the upgrade flow in your dashboard
3. Test coupon codes (see coupon management below)

## 📊 Features Included

### ✅ Subscription Management
- Automatic Pro plan upgrades via Stripe
- **Immediate downgrade on payment failure** (no grace period)
- Webhook handling for subscription events
- Real-time billing history
- Payment method management (without storing sensitive data)

### ✅ Coupon Code Support
- **Pre-checkout coupon validation** with real-time pricing
- **Stripe's built-in promotion codes** in checkout
- **Programmatic coupon application** via API
- Support for percentage and fixed amount discounts
- Duration controls (once, forever, repeating)
- Usage limits and expiration dates

### ✅ Plan Management
- Storage limits automatically updated on plan changes
- Three-tier pricing display
- Dynamic current plan overview
- Upgrade/downgrade functionality

### ✅ Security
- No sensitive payment data stored in your database
- Stripe handles all payment processing
- Webhook signature verification
- Row-level security policies

## 🔄 Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upgrade user to Pro plan |
| `invoice.payment_succeeded` | Record successful payment in billing history |
| `invoice.payment_failed` | **Immediately downgrade user to free plan** |
| `invoice.payment_action_required` | Mark subscription as incomplete (requires user action) |
| `customer.subscription.updated` | Sync subscription status |
| `customer.subscription.deleted` | Downgrade user to free plan |

## 🎟️ Coupon Code Management

### Creating Coupon Codes
Use the included script to easily create and manage coupon codes:

```bash
# Create new coupon codes
node scripts/create-coupon.js

# Example coupons you might create:
# SAVE50 - 50% off first month
# WELCOME25 - 25% off forever  
# STUDENT - $5 off first month
# BLACKFRIDAY - 3 months for $5 each
```

### Coupon Features
- **Real-time validation** before checkout
- **Visual discount preview** in dashboard
- **Multiple discount types:**
  - Percentage off (e.g., 50% off)
  - Fixed amount off (e.g., $5 off)
- **Duration options:**
  - Once (first payment only)
  - Forever (applies to all payments)
  - Repeating (specific number of months)
- **Usage controls:**
  - Maximum redemptions
  - Expiration dates
  - Per-customer limits

### Testing Coupon Codes
1. Create test coupons using the script
2. Go to your dashboard → Payments section
3. Enter coupon code in the Pro plan upgrade section
4. Verify discount calculation and proceed to checkout

## 🎨 UI Changes

### Updated Dashboard Features:
1. **Three-plan comparison** with correct storage limits
2. **Dynamic current plan overview** for all plan types
3. **Stripe checkout integration** for Pro upgrades
4. **🆕 Coupon code input and validation** in upgrade flow
5. **Enterprise plan display** with custom storage limits
6. **Real-time billing history** from Stripe data

### Plan-Specific Storage Limits:
- Free users see 10MB limit
- Pro users see 50MB limit  
- Enterprise users see their custom limit

### 🆕 Payment Failure Handling:
- **No grace period** - users are immediately downgraded on payment failure
- Clear billing history showing failed payments
- Users can re-upgrade at any time

## 🚀 Testing Checklist

- [ ] Database schema updated successfully
- [ ] Stripe webhook endpoint configured with all events
- [ ] Environment variables set
- [ ] Free to Pro upgrade works
- [ ] **Coupon codes validate and apply correctly**
- [ ] **Payment failure immediately downgrades user**
- [ ] Webhook events process correctly
- [ ] Billing history appears
- [ ] Storage limits enforce correctly
- [ ] Enterprise plan displays properly

## 🆘 Troubleshooting

### Common Issues:

1. **Webhook failures**: Check webhook signing secret
2. **Database errors**: Ensure schema is updated
3. **Payment failures**: Verify Stripe keys are correct
4. **Coupon validation fails**: Ensure coupon exists in Stripe and is valid
5. **User not downgraded after payment failure**: Check webhook logs
6. **Storage not updating**: Check triggers in database

### Logs to Check:
- Stripe webhook logs in dashboard
- Supabase function logs
- Browser console for frontend errors
- Next.js API route logs 