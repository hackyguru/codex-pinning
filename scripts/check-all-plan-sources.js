const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllPlanSources() {
  console.log('🔍 Checking ALL sources of plan information...\n');

  const userId = 'did:privy:cmd54uyqx033rl10ow8wn09l0';

  try {
    // Check 1: users table (should be removed but might still exist)
    console.log('📋 1. Checking users table...');
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.log(`   ❌ Error: ${userError.message}`);
      } else {
        console.log(`   📊 User data:`, userData);
        if (userData.plan_type) {
          console.log(`   ⚠️  PROBLEM: users.plan_type still exists: ${userData.plan_type}`);
        } else {
          console.log(`   ✅ users.plan_type column removed`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error accessing users table: ${error.message}`);
    }

    // Check 2: subscriptions table
    console.log('\n📋 2. Checking subscriptions table...');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.log(`   ❌ Error: ${subError.message}`);
    } else {
      console.log(`   📊 Subscriptions:`, subscriptions);
      const activeSub = subscriptions.find(s => s.status === 'active');
      if (activeSub) {
        console.log(`   ✅ Active subscription plan: ${activeSub.plan_type}`);
      } else {
        console.log(`   ⚠️  No active subscription found`);
      }
    }

    // Check 3: user_current_plans view
    console.log('\n📋 3. Checking user_current_plans view...');
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('user_current_plans')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (viewError) {
        console.log(`   ❌ Error: ${viewError.message}`);
      } else {
        console.log(`   📊 View data:`, viewData);
        console.log(`   📊 Plan source: ${viewData.plan_source}`);
        console.log(`   📊 Current plan: ${viewData.current_plan}`);
      }
    } catch (error) {
      console.log(`   ❌ Error accessing view: ${error.message}`);
    }

    // Check 4: What UserService.getUserPlan() would return
    console.log('\n📋 4. Simulating UserService.getUserPlan()...');
    const { data: activeSubscription, error: planError } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (planError) {
      console.log(`   ⚠️  No active subscription found, would return: free`);
    } else {
      console.log(`   ✅ Would return: ${activeSubscription.plan_type}`);
    }

    // Check 5: Frontend API endpoint
    console.log('\n📋 5. Testing frontend API endpoint...');
    try {
      // This simulates what the frontend calls
      const response = await fetch('http://localhost:3001/api/user/stats', {
        headers: {
          'Authorization': `Bearer test-token`, // You'd need a real token
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   📊 API returns plan: ${data.stats?.planType}`);
      } else {
        console.log(`   ⚠️  API call failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  API call failed: ${error.message}`);
    }

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('🔍 Check which table your dashboard is reading from');
    console.log('🔍 Ensure webhooks are actually updating the subscriptions table');
    console.log('🔍 Verify the database migration was completed');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkAllPlanSources().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 