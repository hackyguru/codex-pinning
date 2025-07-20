const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualUpgrade() {
  console.log('🔧 Manually upgrading account to Pro...\n');
  
  // Your user ID from the check
  const userId = 'did:privy:cmd54uyqx033rl10ow8wn09l0';
  const userEmail = '0x18331B7b011d822F963236d0b6b8775Fb86fc1AF@wallet.placeholder';
  
  try {
    // Step 1: Get the most recent active subscription for this user from Stripe
    console.log('🔍 Finding your most recent Stripe subscription...');
    
    const subscriptions = await stripe.subscriptions.list({
      limit: 20,
      status: 'active',
      expand: ['data.customer']
    });

    let userSubscription = null;
    let userCustomerId = null;

    for (const sub of subscriptions.data) {
      const customer = sub.customer;
      if (customer.metadata?.userId === userId) {
        // Get the most recent one (Stripe returns in descending order by created)
        if (!userSubscription || sub.created > userSubscription.created) {
          userSubscription = sub;
          userCustomerId = customer.id;
        }
      }
    }

    if (!userSubscription) {
      console.error('❌ No active Stripe subscription found for this user');
      return;
    }

    console.log(`✅ Found subscription: ${userSubscription.id}`);
    console.log(`   Status: ${userSubscription.status}`);
    console.log(`   Created: ${new Date(userSubscription.created * 1000).toLocaleString()}`);

    // Step 2: Update the subscriptions table
    console.log('\n💾 Updating subscriptions table...');
    
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        plan_type: 'pro',
        stripe_subscription_id: userSubscription.id,
        stripe_customer_id: userCustomerId,
        status: userSubscription.status,
        current_period_start: userSubscription.current_period_start ? 
          new Date(userSubscription.current_period_start * 1000).toISOString() : null,
        current_period_end: userSubscription.current_period_end ? 
          new Date(userSubscription.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: userSubscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (subError) {
      console.error('❌ Failed to update subscriptions table:', subError);
    } else {
      console.log('✅ Subscriptions table updated');
    }

    // Step 3: Users table no longer stores plan_type (subscriptions is single source of truth)
    console.log('\n👤 Skipping users table update (plan now stored in subscriptions only)...');

    // Step 4: Verify the changes
    console.log('\n🔍 Verifying the upgrade...');
    
    const { data: updatedSub } = await supabase
      .from('subscriptions')
      .select('plan_type, status, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    console.log('\n📊 Updated Status:');
    console.log(`   Subscription Plan: ${updatedSub?.plan_type} (SINGLE source of truth)`);
    console.log(`   Subscription Status: ${updatedSub?.status}`);
    console.log(`   Stripe Sub ID: ${updatedSub?.stripe_subscription_id}`);

    if (updatedUser?.plan_type === 'pro' && updatedSub?.plan_type === 'pro') {
      console.log('\n🎉 SUCCESS! Account successfully upgraded to Pro plan!');
      console.log('   ✅ You now have 50 MB storage');
      console.log('   ✅ Unlimited API requests');
      console.log('   ✅ Priority support');
      console.log('   ✅ Advanced features');
      console.log('\n🔄 Please refresh your dashboard to see the changes!');
    } else {
      console.log('\n❌ Upgrade verification failed. Manual intervention needed.');
    }

  } catch (error) {
    console.error('💥 Manual upgrade failed:', error);
  }
}

manualUpgrade().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 