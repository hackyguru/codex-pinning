const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseSubscriptionIssue() {
  console.log('🔍 Diagnosing subscription upgrade issue...\n');

  try {
    // Step 1: Check all users and their current plans
    console.log('📊 Current users in database:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, plan_type, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    users.forEach(user => {
      console.log(`   ${user.email} - ${user.plan_type} plan (updated: ${new Date(user.updated_at).toLocaleString()})`);
    });

    // Step 2: Check subscriptions table
    console.log('\n📋 Subscriptions in database:');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
    } else if (subscriptions.length === 0) {
      console.log('   ⚠️  No subscriptions found in database');
    } else {
      subscriptions.forEach(sub => {
        console.log(`   User: ${sub.user_id}`);
        console.log(`   Plan: ${sub.plan_type}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Stripe Sub ID: ${sub.stripe_subscription_id}`);
        console.log(`   Updated: ${new Date(sub.updated_at).toLocaleString()}\n`);
      });
    }

    // Step 3: Check recent Stripe subscriptions
    console.log('🔍 Recent Stripe subscriptions:');
    const stripeSubscriptions = await stripe.subscriptions.list({
      limit: 10,
      expand: ['data.customer']
    });

    if (stripeSubscriptions.data.length === 0) {
      console.log('   ⚠️  No subscriptions found in Stripe');
    } else {
      for (const sub of stripeSubscriptions.data) {
        const customer = sub.customer;
        console.log(`   Subscription: ${sub.id}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Customer: ${customer.id} (${customer.email})`);
        console.log(`   Created: ${new Date(sub.created * 1000).toLocaleString()}`);
        console.log(`   Metadata: ${JSON.stringify(customer.metadata)}`);
        
        // Check if this subscription is in our database
        const { data: dbSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (dbSub) {
          console.log(`   ✅ Found in database: User ${dbSub.user_id}`);
        } else {
          console.log(`   ❌ NOT FOUND in database - this might be the issue!`);
        }
        console.log('');
      }
    }

    // Step 4: Check recent checkout sessions
    console.log('💳 Recent checkout sessions:');
    const sessions = await stripe.checkout.sessions.list({
      limit: 5,
      expand: ['data.customer']
    });

    sessions.data.forEach(session => {
      console.log(`   Session: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(`   Mode: ${session.mode}`);
      console.log(`   Subscription: ${session.subscription || 'None'}`);
      console.log(`   Customer: ${session.customer}`);
      console.log(`   Metadata: ${JSON.stringify(session.metadata)}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      console.log('');
    });

    // Step 5: Check webhook events
    console.log('📡 Recent webhook events:');
    const events = await stripe.events.list({
      limit: 10,
      types: ['checkout.session.completed', 'invoice.payment_succeeded']
    });

    events.data.forEach(event => {
      console.log(`   Event: ${event.type}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Created: ${new Date(event.created * 1000).toLocaleString()}`);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`   Session ID: ${session.id}`);
        console.log(`   Subscription: ${session.subscription}`);
        console.log(`   Metadata: ${JSON.stringify(session.metadata)}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('💥 Diagnosis failed:', error);
  }
}

async function fixMissingSubscription() {
  console.log('🔧 Attempting to fix missing subscription...\n');

  try {
    // Get the most recent successful subscription from Stripe
    const stripeSubscriptions = await stripe.subscriptions.list({
      limit: 5,
      status: 'active',
      expand: ['data.customer']
    });

    if (stripeSubscriptions.data.length === 0) {
      console.log('❌ No active subscriptions found in Stripe');
      return;
    }

    for (const subscription of stripeSubscriptions.data) {
      const customer = subscription.customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        console.log(`⚠️  Subscription ${subscription.id} has no userId in customer metadata`);
        continue;
      }

      // Check if this subscription is already in our database
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (existingSub) {
        console.log(`✅ Subscription ${subscription.id} already exists in database`);
        continue;
      }

      // Check if user exists
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!user) {
        console.log(`❌ User ${userId} not found in database`);
        continue;
      }

      console.log(`🔧 Fixing subscription for user: ${user.email}`);

      // Add subscription to database
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_type: 'pro',
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customer.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (subError) {
        console.error(`❌ Failed to create subscription record:`, subError);
        continue;
      }

      // Update user plan
      const { error: userError } = await supabase
        .from('users')
        .update({
          plan_type: 'pro',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (userError) {
        console.error(`❌ Failed to update user plan:`, userError);
        continue;
      }

      console.log(`✅ Successfully fixed subscription for ${user.email}`);
      console.log(`   Subscription ID: ${subscription.id}`);
      console.log(`   Plan: pro`);
      console.log(`   Status: ${subscription.status}`);
    }

  } catch (error) {
    console.error('💥 Fix failed:', error);
  }
}

async function main() {
  console.log('🚀 ThirdStorage - Subscription Diagnostic Tool\n');
  
  await diagnoseSubscriptionIssue();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔧 ATTEMPTING AUTOMATIC FIX...');
  console.log('='.repeat(60) + '\n');
  
  await fixMissingSubscription();
  
  console.log('\n✨ Diagnostic and fix process completed!');
  console.log('If the issue persists, check:');
  console.log('1. Webhook endpoint configuration in Stripe');
  console.log('2. STRIPE_WEBHOOK_SECRET environment variable');
  console.log('3. Server logs for webhook errors');
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { diagnoseSubscriptionIssue, fixMissingSubscription }; 