const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
// Import would need transpilation, so keep plan logic here for now
const PLAN_NAMES = {
  pro: 'pro',
  free: 'free'
};
require('dotenv').config({ path: '.env' });

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncStripeSubscriptions() {
  console.log('🔄 Starting Stripe → Database sync...\n');

  try {
    // Get all active subscriptions from Stripe
    console.log('📡 Fetching active subscriptions from Stripe...');
    
    const subscriptions = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const response = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer']
      });

      subscriptions.push(...response.data);
      hasMore = response.has_more;
      
      if (hasMore) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`✅ Found ${subscriptions.length} active subscriptions in Stripe\n`);

    if (subscriptions.length === 0) {
      console.log('🎉 No active subscriptions found. Your data might already be in sync!');
      return;
    }

    // Process each subscription
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const subscription of subscriptions) {
      try {
        // Get customer metadata to find user ID
        const customer = subscription.customer;
        const userId = customer.metadata?.userId;

        if (!userId) {
          console.log(`⚠️  Skipping subscription ${subscription.id} - no userId in metadata`);
          skippedCount++;
          continue;
        }

        // Check if user exists in database
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, plan_type, email')
          .eq('id', userId)
          .single();

        if (userError || !user) {
          console.log(`❌ User ${userId} not found in database - skipping`);
          skippedCount++;
          continue;
        }

        // Determine plan type from subscription
        const planType = 'pro'; // Assuming all subscriptions are Pro
        
                 // Safe date conversion
         const safeDate = (timestamp) => {
           try {
             return timestamp ? new Date(timestamp * 1000).toISOString() : null;
           } catch (error) {
             console.log(`⚠️  Invalid timestamp: ${timestamp}`);
             return null;
           }
         };

         // Sync subscription table
         const { error: subError } = await supabase
           .from('subscriptions')
           .upsert({
             user_id: userId,
             plan_type: planType,
             stripe_subscription_id: subscription.id,
             stripe_customer_id: customer.id,
             status: subscription.status,
             current_period_start: safeDate(subscription.current_period_start),
             current_period_end: safeDate(subscription.current_period_end),
             cancel_at_period_end: subscription.cancel_at_period_end || false,
             updated_at: new Date().toISOString()
           }, {
             onConflict: 'user_id'
           });

        if (subError) {
          console.log(`❌ Failed to sync subscription for ${userId}:`, subError.message);
          errorCount++;
          continue;
        }

        // Note: No longer updating users.plan_type - subscriptions table is now single source of truth

        console.log(`✅ Synced: ${user.email} → ${planType} plan`);
        syncedCount++;

      } catch (error) {
        console.log(`❌ Error processing subscription ${subscription.id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n📊 Sync Summary:');
    console.log(`✅ Successfully synced: ${syncedCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📡 Total Stripe subscriptions: ${subscriptions.length}`);

    if (syncedCount > 0) {
      console.log('\n🎉 Database sync completed! Your subscription data should now match Stripe.');
    }

  } catch (error) {
    console.error('💥 Fatal error during sync:', error);
    process.exit(1);
  }
}

// Also sync cancelled/past_due subscriptions
async function syncInactiveSubscriptions() {
  console.log('\n🔄 Checking for inactive subscriptions...\n');

  try {
    const statuses = ['canceled', 'past_due', 'unpaid'];
    
    for (const status of statuses) {
      console.log(`📡 Fetching ${status} subscriptions...`);
      
      const subscriptions = await stripe.subscriptions.list({
        status: status,
        limit: 100,
        expand: ['data.customer']
      });

      for (const subscription of subscriptions.data) {
        const customer = subscription.customer;
        const userId = customer.metadata?.userId;

        if (!userId) continue;

        // Update to free plan
        await supabase
          .from('subscriptions')
          .update({
            plan_type: 'free',
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        await supabase
          .from('users')
          .update({
            plan_type: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        console.log(`✅ Marked user ${userId} as free (${status})`);
      }
    }
  } catch (error) {
    console.error('Error syncing inactive subscriptions:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 ThirdStorage - Stripe Database Sync\n');
  
  await syncStripeSubscriptions();
  await syncInactiveSubscriptions();
  
  console.log('\n✨ Sync process completed!');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  });
}

module.exports = { syncStripeSubscriptions }; 