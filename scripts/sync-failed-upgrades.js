const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncFailedUpgrades() {
  console.log('🔄 SYNCING FAILED UPGRADES');
  console.log('===========================\n');
  
  console.log('This script will find users who paid for upgrades but');
  console.log('were not upgraded due to missing webhook configuration.\n');

  try {
    // Get recent checkout.session.completed events
    const events = await stripe.events.list({ 
      limit: 50,
      types: ['checkout.session.completed']
    });

    console.log(`📋 Found ${events.data.length} recent checkout sessions\n`);

    let fixedCount = 0;
    let alreadyFixedCount = 0;
    let errorCount = 0;

    for (const event of events.data) {
      const session = event.data.object;
      
      // Skip non-subscription sessions
      if (session.mode !== 'subscription' || !session.subscription) {
        continue;
      }

      // Skip sessions without metadata
      if (!session.metadata || !session.metadata.userId || !session.metadata.planType) {
        console.log(`⚠️  Skipping session ${session.id} - missing metadata`);
        continue;
      }

      const userId = session.metadata.userId;
      const planType = session.metadata.planType;
      const stripeSubscriptionId = session.subscription;

      console.log(`\n👤 Checking user: ${userId.substring(0, 30)}...`);
      console.log(`   Stripe session: ${session.id}`);
      console.log(`   Stripe subscription: ${stripeSubscriptionId}`);
      console.log(`   Target plan: ${planType}`);

      // Check current database state
      const { data: currentSub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.log(`   ❌ Error fetching subscription: ${subError.message}`);
        errorCount++;
        continue;
      }

      // Check if this subscription is already synced
      if (currentSub && currentSub.stripe_subscription_id === stripeSubscriptionId && currentSub.plan_type === planType) {
        console.log(`   ✅ Already synced correctly`);
        alreadyFixedCount++;
        continue;
      }

      // Get the Stripe subscription details
      let stripeSubscription;
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } catch (stripeError) {
        console.log(`   ❌ Error fetching Stripe subscription: ${stripeError.message}`);
        errorCount++;
        continue;
      }

      // Check if the Stripe subscription is still active
      if (stripeSubscription.status !== 'active') {
        console.log(`   ⚠️  Stripe subscription is ${stripeSubscription.status}, skipping`);
        continue;
      }

      console.log(`   🔄 Needs fixing: DB shows plan=${currentSub?.plan_type || 'none'}, stripe_sub=${currentSub?.stripe_subscription_id || 'none'}`);

      // Safe date conversion function
      const safeConvertDate = (timestamp) => {
        if (!timestamp || isNaN(timestamp)) return null;
        try {
          return new Date(timestamp * 1000).toISOString();
        } catch {
          return null;
        }
      };

      // Update the subscription record
      const updateData = {
        user_id: userId,
        plan_type: planType,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeSubscription.customer,
        status: stripeSubscription.status,
        current_period_start: safeConvertDate(stripeSubscription.current_period_start),
        current_period_end: safeConvertDate(stripeSubscription.current_period_end),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      };

      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single();

      if (updateError) {
        console.log(`   ❌ Failed to update subscription: ${updateError.message}`);
        errorCount++;
        continue;
      }

      console.log(`   ✅ Fixed! Updated to plan=${updatedSub.plan_type}, stripe_sub=${updatedSub.stripe_subscription_id}`);
      
      // Add billing history record
      try {
        await supabase
          .from('billing_history')
          .insert({
            user_id: userId,
            stripe_subscription_id: stripeSubscriptionId,
            amount_cents: 1000, // $10 for pro plan
            currency: 'usd',
            status: 'paid',
            plan_type: planType,
            billing_period_start: safeConvertDate(stripeSubscription.current_period_start),
            billing_period_end: safeConvertDate(stripeSubscription.current_period_end),
            paid_at: safeConvertDate(event.created),
            created_at: new Date().toISOString()
          });
        
        console.log(`   ✅ Added billing history record`);
      } catch (billingError) {
        console.log(`   ⚠️  Could not add billing history: ${billingError.message}`);
      }

      fixedCount++;
    }

    console.log('\n🎯 SYNC COMPLETE');
    console.log('================');
    console.log(`✅ Fixed: ${fixedCount} users`);
    console.log(`✅ Already correct: ${alreadyFixedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

    if (fixedCount > 0) {
      console.log('\n🎉 SUCCESS!');
      console.log(`${fixedCount} users who paid for upgrades have been synced.`);
      console.log('They should now see their correct plan in the dashboard.');
      console.log('\nTell affected users to:');
      console.log('1. Refresh their dashboard');
      console.log('2. Clear browser cache if needed');
      console.log('3. Log out and log back in if still having issues');
    } else {
      console.log('\n✅ All users are already synced correctly!');
    }

  } catch (error) {
    console.error('💥 Sync failed:', error);
  }
}

syncFailedUpgrades().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 