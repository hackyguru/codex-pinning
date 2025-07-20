const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUserService() {
  console.log('🧪 Testing UserService.getUserStats() directly...\n');

  const userId = 'did:privy:cmd54uyqx033rl10ow8wn09l0';

  try {
    // Simulate UserService.getUserStats logic exactly
    console.log('📋 1. Testing getUserPlan() logic...');
    
    // Check for active subscription (what getUserPlan does)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    let planFromGetUserPlan;
    if (!subError && subscription) {
      planFromGetUserPlan = subscription.plan_type;
      console.log(`   ✅ getUserPlan() would return: ${planFromGetUserPlan}`);
    } else {
      planFromGetUserPlan = 'free';
      console.log(`   ⚠️  getUserPlan() would return: ${planFromGetUserPlan} (no active subscription)`);
      console.log(`   Error: ${subError?.message}`);
    }

    console.log('\n📋 2. Testing getUserStats() logic...');
    
    // Get user data (no longer fetch plan_type from here)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('storage_used, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log(`   ❌ Error fetching user: ${userError.message}`);
      return;
    }

    console.log(`   📊 User data: storage_used=${userData.storage_used}, email=${userData.email}`);

    // Get files count
    const { count: filesCount, error: filesError } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (filesError) {
      console.log(`   ❌ Error fetching files count: ${filesError.message}`);
      return;
    }

    console.log(`   📊 Files count: ${filesCount}`);

    // Calculate storage limit based on plan
    let storageLimit;
    if (planFromGetUserPlan === 'free') {
      storageLimit = 10485760; // 10MB
    } else if (planFromGetUserPlan === 'pro') {
      storageLimit = 52428800; // 50MB
    } else if (planFromGetUserPlan === 'enterprise') {
      storageLimit = 1073741824; // 1GB
    } else {
      storageLimit = 10485760; // Default to free
    }

    const usagePercentage = (userData.storage_used / storageLimit) * 100;

    const finalStats = {
      storageUsed: userData.storage_used,
      storageLimit,
      planType: planFromGetUserPlan,
      email: userData.email,
      filesCount: filesCount || 0,
      usagePercentage: Math.min(usagePercentage, 100)
    };

    console.log('\n📊 Final UserService.getUserStats() result:');
    console.log(JSON.stringify(finalStats, null, 2));

    // Test if this matches what the API would return
    console.log('\n📋 3. Summary:');
    console.log(`   Plan Type: ${finalStats.planType}`);
    console.log(`   Storage: ${finalStats.storageUsed} / ${finalStats.storageLimit} bytes`);
    console.log(`   Usage: ${finalStats.usagePercentage.toFixed(1)}%`);

    console.log('\n🎯 If dashboard still shows "free", the issue is:');
    console.log('   1. Frontend cache (refresh with Cmd+Shift+R)');
    console.log('   2. Local storage cache');
    console.log('   3. Authentication issue with API');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testUserService().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 