# 🔧 STRIPE WEBHOOK SETUP GUIDE

## ✅ CRITICAL: Set up webhooks to prevent future upgrade failures

### Step 1: Get Your Webhook URL
Your webhook endpoint is: `https://YOUR-DOMAIN.com/api/stripe/webhook`

Example: `https://thirdstorage.vercel.app/api/stripe/webhook`

### Step 2: Create Webhook in Stripe Dashboard

1. **Go to:** [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. **Click:** "Add endpoint"
3. **URL:** Enter your webhook URL from Step 1
4. **Events:** Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`  
   - `invoice.payment_action_required`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. **Click:** "Add endpoint"

### Step 3: Get Webhook Secret
1. **Click** on your new webhook endpoint
2. **Copy** the "Signing secret" (starts with `whsec_`)
3. **Add to .env:**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Step 4: Test Webhook
1. Create a new test user
2. Upgrade to Pro plan
3. Verify user shows Pro plan immediately
4. Check Stripe Dashboard > Webhooks for delivery logs

## 🎯 Quick Setup Script (Alternative)

Run this script to auto-configure webhooks:

```bash
# Set your webhook URL
export WEBHOOK_URL="https://your-domain.com/api/stripe/webhook"

# Run setup script  
node scripts/setup-stripe-webhook.js
```

## ✅ Verification

After setup, new upgrades should:
1. ✅ Complete payment
2. ✅ Update database immediately via webhook
3. ✅ Show Pro plan in dashboard instantly

## 🚨 Current Status

- ✅ 9 existing users fixed (paid but stuck on free)
- ⚠️  Webhooks still need setup for future upgrades
- 🎯 Priority: Set up webhooks ASAP

## 🧪 Test After Setup

Create new test account → upgrade → verify immediate plan change 