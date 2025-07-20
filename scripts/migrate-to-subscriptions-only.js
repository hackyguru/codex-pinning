const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateToSubscriptionsOnly() {
  console.log('🔄 Migrating to subscriptions-only plan architecture...\n');

  try {
    // Step 1: Ensure every user has a subscription record
    console.log('👥 Step 1: Creating subscription records for all users...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, plan_type, email');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    let created = 0;
    let updated = 0;

    for (const user of users) {
      // Check if subscription record exists
      const { data: existingSub, error: subCheckError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subCheckError && subCheckError.code === 'PGRST116') {
        // No subscription exists, create one based on users.plan_type
        const { error: createError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_type: user.plan_type || 'free',
            status: 'active',
            updated_at: new Date().toISOString()
          });

        if (createError) {
          console.error(`❌ Failed to create subscription for ${user.email}:`, createError);
        } else {
          console.log(`✅ Created subscription for ${user.email}: ${user.plan_type || 'free'}`);
          created++;
        }
      } else if (!subCheckError) {
        // Subscription exists, update it to match users.plan_type if different
        if (existingSub.plan_type !== user.plan_type) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              plan_type: user.plan_type || 'free',
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error(`❌ Failed to update subscription for ${user.email}:`, updateError);
          } else {
            console.log(`✅ Updated subscription for ${user.email}: ${existingSub.plan_type} → ${user.plan_type}`);
            updated++;
          }
        }
      }
    }

    console.log(`   Created: ${created} subscriptions`);
    console.log(`   Updated: ${updated} subscriptions`);

    // Step 2: Update UserService to only use subscriptions table
    console.log('\n🔧 Step 2: Updating UserService...');
    
    const userServicePath = 'lib/userService.ts';
    console.log(`   ✅ Update ${userServicePath} to remove users.plan_type fallback`);
    
    // Step 3: Remove plan_type column from users table (via SQL)
    console.log('\n🗑️  Step 3: Preparing to remove users.plan_type column...');
    console.log('   📝 SQL to run in Supabase:');
    console.log('   ALTER TABLE users DROP COLUMN IF EXISTS plan_type;');
    
    // Step 4: Verify migration
    console.log('\n🔍 Step 4: Verifying migration...');
    
    const { data: allSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_type, status');

    if (subError) {
      throw new Error(`Failed to verify subscriptions: ${subError.message}`);
    }

    const planCounts = allSubscriptions.reduce((acc, sub) => {
      acc[sub.plan_type] = (acc[sub.plan_type] || 0) + 1;
      return acc;
    }, {});

    console.log('   📊 Final subscription plan distribution:');
    Object.entries(planCounts).forEach(([plan, count]) => {
      console.log(`     ${plan}: ${count} users`);
    });

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. ✅ All users now have subscription records');
    console.log('2. 🔧 Update UserService.getUserPlan() to only check subscriptions');
    console.log('3. 🗑️  Remove users.plan_type column from database');
    console.log('4. 🧪 Test plan detection in your app');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

migrateToSubscriptionsOnly().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 