# 🔄 HOW TO RESTORE UPGRADE FUNCTIONALITY

## When Webhooks Are Ready

After you've set up Stripe webhooks properly, follow these steps to restore the upgrade functionality:

### Step 1: Remove Coming Soon Popup

In `pages/dashboard.tsx`, find the `handleUpgradeToPro` function and:

1. **Remove this line:**
   ```typescript
   setShowComingSoonModal(true);
   ```

2. **Uncomment all the code between `/*` and `*/`**

3. **Remove the coming soon modal state:**
   ```typescript
   // DELETE THIS LINE:
   const [showComingSoonModal, setShowComingSoonModal] = useState(false);
   ```

4. **Remove the coming soon modal component** (the entire modal JSX at the bottom)

### Step 2: Verify Webhooks Are Working

1. ✅ Webhook endpoint configured in Stripe Dashboard
2. ✅ `STRIPE_WEBHOOK_SECRET` in `.env` file  
3. ✅ Test upgrade works end-to-end

### Step 3: Test the Restoration

1. Create new test user
2. Click "Upgrade to Pro"
3. Complete payment
4. Verify user immediately shows Pro plan
5. Check Stripe Dashboard > Webhooks for successful delivery

## Quick Restore Commands

```bash
# Test webhook endpoint first
node scripts/test-webhook-endpoint.js

# Run sync script to fix any pending upgrades
node scripts/sync-failed-upgrades.js
```

## Current Status

- ✅ Upgrade buttons show "Coming Soon" popup
- ✅ Original Stripe code preserved and commented out
- ✅ Easy to restore when webhooks are ready
- ✅ No risk of users getting stuck on free plan

Ready to restore when your webhooks are properly configured! 