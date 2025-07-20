const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentState() {
  console.log('🔍 Checking current account state...\n');

  try {
    // Check users table
    console.log('👤 Users table:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('updated_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    users.forEach(user => {
      console.log(`   Email: ${user.email}`);
      console.log(`   Plan: ${user.plan_type}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Updated: ${new Date(user.updated_at).toLocaleString()}`);
      console.log('');
    });

    // Check subscriptions table
    console.log('📋 Subscriptions table:');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
    } else if (subscriptions.length === 0) {
      console.log('   ⚠️  No subscriptions found');
    } else {
      subscriptions.forEach(sub => {
        console.log(`   User ID: ${sub.user_id}`);
        console.log(`   Plan: ${sub.plan_type}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Stripe Sub ID: ${sub.stripe_subscription_id}`);
        console.log(`   Customer ID: ${sub.stripe_customer_id}`);
        console.log(`   Updated: ${new Date(sub.updated_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Test UserService.getUserPlan() for each user
    console.log('🧪 Testing UserService.getUserPlan():');
    
    // We'll simulate what UserService.getUserPlan() does
    for (const user of users) {
      console.log(`\n   Testing for user: ${user.email} (${user.id})`);
      
      // Method 1: Check subscriptions table first (primary source)
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscription) {
        console.log(`   ✅ Subscription found: ${subscription.plan_type} (${subscription.status})`);
      } else {
        console.log(`   ⚠️  No active subscription found, checking users table...`);
        console.log(`   📋 Users table plan: ${user.plan_type}`);
      }
    }

  } catch (error) {
    console.error('💥 Check failed:', error);
  }
}

checkCurrentState().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 