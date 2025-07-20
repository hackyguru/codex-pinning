const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceUpgrade() {
  console.log('⚡ FORCE UPGRADING ACCOUNT TO PRO...\n');
  
  const userId = 'did:privy:cmd54uyqx033rl10ow8wn09l0';
  
  try {
    // Step 1: Force update users table
    console.log('👤 Force updating users table...');
    
    const { data: beforeUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('   Before:', beforeUser?.plan_type);
    
    const { data: updatedUserData, error: userError } = await supabase
      .from('users')
      .update({
        plan_type: 'pro',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (userError) {
      console.error('❌ Users table update failed:', userError);
    } else {
      console.log('✅ Users table updated successfully');
      console.log('   After:', updatedUserData?.plan_type);
    }

    // Step 2: Force update subscriptions table
    console.log('\n📋 Force updating subscriptions table...');
    
    const { data: beforeSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log('   Before:', beforeSub?.plan_type);
    
    const { data: updatedSubData, error: subError } = await supabase
      .from('subscriptions')
      .update({
        plan_type: 'pro',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (subError) {
      console.error('❌ Subscriptions table update failed:', subError);
    } else {
      console.log('✅ Subscriptions table updated successfully');
      console.log('   After:', updatedSubData?.plan_type);
    }

    // Step 3: Verify both updates worked
    console.log('\n🔍 FINAL VERIFICATION...');
    
    const { data: finalUser } = await supabase
      .from('users')
      .select('plan_type, updated_at')
      .eq('id', userId)
      .single();

    const { data: finalSub } = await supabase
      .from('subscriptions')
      .select('plan_type, status, updated_at')
      .eq('user_id', userId)
      .single();

    console.log('\n📊 FINAL STATUS:');
    console.log(`   Users table plan: ${finalUser?.plan_type}`);
    console.log(`   Users updated: ${finalUser?.updated_at}`);
    console.log(`   Subscriptions plan: ${finalSub?.plan_type}`);
    console.log(`   Subscriptions status: ${finalSub?.status}`);
    console.log(`   Subscriptions updated: ${finalSub?.updated_at}`);

    if (finalUser?.plan_type === 'pro' && finalSub?.plan_type === 'pro') {
      console.log('\n🎉 SUCCESS! Account forcefully upgraded to Pro!');
      console.log('\n🔄 PLEASE REFRESH YOUR DASHBOARD NOW!');
      console.log('   If you still see Free plan, clear your browser cache.');
    } else {
      console.log('\n❌ FORCE UPGRADE FAILED!');
      console.log('   This indicates a serious database issue.');
    }

    // Step 4: Test the UserService logic
    console.log('\n🧪 Testing UserService logic...');
    
    const { data: testSub } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (testSub) {
      console.log(`   UserService would return: ${testSub.plan_type}`);
    } else {
      console.log('   UserService would fallback to users table');
      console.log(`   Which has: ${finalUser?.plan_type}`);
    }

  } catch (error) {
    console.error('💥 Force upgrade failed:', error);
  }
}

forceUpgrade().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 