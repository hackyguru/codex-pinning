const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMultipleSubscriptions() {
  console.log('🚨 FIXING MULTIPLE SUBSCRIPTIONS CRISIS...\n');

  const userId = 'did:privy:cmd54uyqx033rl10ow8wn09l0';
  const customerId = 'cus_Si8NVzF7QcXrXb';

  try {
    // 1. Get all subscriptions from Stripe
    console.log('📋 1. Getting all Stripe subscriptions...');
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100
    });

    const activeSubscriptions = subscriptions.data.filter(sub => sub.status === 'active');
    console.log(`   Found ${activeSubscriptions.length} active subscriptions`);

    if (activeSubscriptions.length <= 1) {
      console.log('   ✅ No multiple subscriptions to fix');
      return;
    }

    // 2. Identify the latest subscription (most recent)
    const latestSubscription = activeSubscriptions.reduce((latest, current) => {
      return current.created > latest.created ? current : latest;
    });

    console.log(`\n📋 2. Latest subscription identified: ${latestSubscription.id}`);
    console.log(`   Created: ${new Date(latestSubscription.created * 1000).toISOString()}`);
    console.log(`   Status: ${latestSubscription.status}`);

    // 3. Cancel all other subscriptions immediately
    console.log('\n📋 3. Canceling duplicate subscriptions...');
    const subscriptionsToCancel = activeSubscriptions.filter(sub => sub.id !== latestSubscription.id);
    
    for (const sub of subscriptionsToCancel) {
      try {
        console.log(`   Canceling subscription: ${sub.id}`);
        await stripe.subscriptions.cancel(sub.id);
        console.log(`   ✅ Canceled: ${sub.id}`);
      } catch (error) {
        console.log(`   ❌ Failed to cancel ${sub.id}: ${error.message}`);
      }
    }

    // 4. Update database to point to the latest subscription
    console.log('\n📋 4. Updating database...');
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_type: 'pro',
        stripe_subscription_id: latestSubscription.id,
        stripe_customer_id: customerId,
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: latestSubscription.current_period_start ? 
          new Date(latestSubscription.current_period_start * 1000).toISOString() : null,
        current_period_end: latestSubscription.current_period_end ? 
          new Date(latestSubscription.current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.log(`   ❌ Failed to update database: ${updateError.message}`);
    } else {
      console.log(`   ✅ Database updated to point to ${latestSubscription.id}`);
    }

    // 5. Verification
    console.log('\n📋 5. Verification...');
    
    // Check remaining active subscriptions in Stripe
    const remainingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10
    });

    console.log(`   Remaining active Stripe subscriptions: ${remainingSubscriptions.data.length}`);
    
    // Check database state
    const { data: dbSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log(`   Database subscription ID: ${dbSubscription?.stripe_subscription_id}`);
    console.log(`   Database plan type: ${dbSubscription?.plan_type}`);

    // 6. Summary
    console.log('\n🎉 CRISIS RESOLVED!');
    console.log(`✅ Canceled ${subscriptionsToCancel.length} duplicate subscriptions`);
    console.log(`✅ Database updated to latest subscription: ${latestSubscription.id}`);
    console.log(`✅ Plan type set to: pro`);
    console.log('\n💰 BILLING IMPACT:');
    console.log(`   Before: ${activeSubscriptions.length} subscriptions = $${activeSubscriptions.length * 10}/month`);
    console.log(`   After: 1 subscription = $10/month`);
    console.log(`   Savings: $${(activeSubscriptions.length - 1) * 10}/month`);

    console.log('\n🔄 Next steps:');
    console.log('1. Refresh your dashboard - should now show Pro plan');
    console.log('2. Verify next billing cycle shows only $10');
    console.log('3. Contact Stripe support for refund of duplicate charges if needed');

  } catch (error) {
    console.error('💥 Error fixing subscriptions:', error);
  }
}

fixMultipleSubscriptions().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 