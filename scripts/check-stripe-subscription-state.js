const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStripeSubscriptionState() {
  console.log('🔍 Checking Stripe vs Database subscription state...\n');

  const userId = 'did:privy:cmd54uyqx033rl10ow8wn09l0';
  const customerId = 'cus_Si8NVzF7QcXrXb';

  try {
    // 1. Check what's in our database
    console.log('📋 1. Database subscription state:');
    const { data: dbSubscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (dbError) {
      console.log(`   ❌ Database error: ${dbError.message}`);
      return;
    }

    console.log('   📊 Database subscription:');
    console.log(`      Plan: ${dbSubscription.plan_type}`);
    console.log(`      Status: ${dbSubscription.status}`);
    console.log(`      Stripe Sub ID: ${dbSubscription.stripe_subscription_id}`);
    console.log(`      Cancel at period end: ${dbSubscription.cancel_at_period_end}`);
    console.log(`      Updated: ${dbSubscription.updated_at}`);

    // 2. Check what's in Stripe
    console.log('\n📋 2. Stripe subscription state:');
    
    // Get customer's subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10
    });

    console.log(`   📊 Found ${subscriptions.data.length} subscription(s) in Stripe:`);

    for (const sub of subscriptions.data) {
      console.log(`\n   Subscription ID: ${sub.id}`);
      console.log(`      Status: ${sub.status}`);
      console.log(`      Cancel at period end: ${sub.cancel_at_period_end}`);
      // Safe date conversion
      const startDate = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : 'N/A';
      const endDate = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : 'N/A';
      console.log(`      Current period: ${startDate} to ${endDate}`);
      console.log(`      Items: ${sub.items.data.map(item => item.price.nickname || item.price.id).join(', ')}`);
      
      // Check if this matches our database subscription
      if (sub.id === dbSubscription.stripe_subscription_id) {
        console.log(`      ✅ This matches our database subscription`);
      } else {
        console.log(`      ⚠️  This is different from our database subscription`);
      }
    }

    // 3. Check recent webhook events
    console.log('\n📋 3. Recent webhook events:');
    const events = await stripe.events.list({
      types: [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded'
      ],
      limit: 10
    });

    console.log(`   📊 Found ${events.data.length} recent events:`);
    for (const event of events.data) {
      console.log(`\n   Event: ${event.id}`);
      console.log(`      Type: ${event.type}`);
      console.log(`      Created: ${new Date(event.created * 1000).toISOString()}`);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`      Customer: ${session.customer}`);
        console.log(`      Subscription: ${session.subscription}`);
      } else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        console.log(`      Subscription: ${subscription.id}`);
        console.log(`      Status: ${subscription.status}`);
      }
    }

    // 4. Analysis
    console.log('\n📋 4. Analysis:');
    const activeStripeSubscriptions = subscriptions.data.filter(s => s.status === 'active');
    
    if (activeStripeSubscriptions.length > 1) {
      console.log(`   ⚠️  WARNING: Multiple active subscriptions found in Stripe (${activeStripeSubscriptions.length})`);
      console.log(`      This could cause webhook processing issues`);
    }

    const latestStripeSub = subscriptions.data[0]; // Most recent
    if (latestStripeSub && latestStripeSub.id !== dbSubscription.stripe_subscription_id) {
      console.log(`   ⚠️  MISMATCH: Database points to ${dbSubscription.stripe_subscription_id}`);
      console.log(`      But latest Stripe subscription is ${latestStripeSub.id}`);
      console.log(`      This suggests webhook didn't update our database`);
    }

    if (latestStripeSub && latestStripeSub.status === 'active' && dbSubscription.plan_type === 'free') {
      console.log(`   ⚠️  PROBLEM: Stripe shows active subscription but database shows free plan`);
      console.log(`      This confirms webhook processing failed`);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkStripeSubscriptionState().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 