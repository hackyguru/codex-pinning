const Stripe = require('stripe');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkWebhooks() {
  console.log('🔍 Checking Stripe webhook configuration...\n');

  try {
    // List all webhook endpoints
    const webhooks = await stripe.webhookEndpoints.list();
    
    console.log(`📡 Found ${webhooks.data.length} webhook endpoint(s):\n`);
    
    webhooks.data.forEach((webhook, index) => {
      console.log(`Webhook ${index + 1}:`);
      console.log(`   URL: ${webhook.url}`);
      console.log(`   Status: ${webhook.status}`);
      console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
      console.log(`   Created: ${new Date(webhook.created * 1000).toLocaleString()}`);
      console.log('');
    });

    if (webhooks.data.length === 0) {
      console.log('❌ No webhook endpoints configured!');
      console.log('   This explains why payments succeed but accounts stay on free plan.');
    } else {
      // Check if any webhook points to localhost
      const localhostWebhooks = webhooks.data.filter(w => 
        w.url.includes('localhost') || w.url.includes('127.0.0.1')
      );
      
      if (localhostWebhooks.length > 0) {
        console.log('⚠️  WARNING: Found localhost webhook endpoints:');
        localhostWebhooks.forEach(w => {
          console.log(`   ${w.url} - This won't work from Stripe's servers!`);
        });
        console.log('');
      }

      // Check for the right events
      const requiredEvents = [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded'
      ];

      webhooks.data.forEach(webhook => {
        const missingEvents = requiredEvents.filter(event => 
          !webhook.enabled_events.includes(event)
        );
        
        if (missingEvents.length > 0) {
          console.log(`⚠️  Webhook ${webhook.url} missing events:`);
          missingEvents.forEach(event => console.log(`   - ${event}`));
          console.log('');
        }
      });
    }

    // Check recent webhook delivery attempts
    console.log('📋 Recent webhook events:');
    const events = await stripe.events.list({
      types: ['checkout.session.completed'],
      limit: 5
    });

    if (events.data.length === 0) {
      console.log('   No recent checkout.session.completed events found');
    } else {
      for (const event of events.data) {
        console.log(`   Event: ${event.id}`);
        console.log(`   Type: ${event.type}`);
        console.log(`   Created: ${new Date(event.created * 1000).toLocaleString()}`);
        
        // Check delivery attempts for this event
        try {
          const deliveryAttempts = await stripe.events.retrieve(event.id, {
            expand: ['data.object']
          });
          
          console.log(`   Delivery attempts: ${deliveryAttempts.request?.idempotency_key ? 'Sent' : 'Unknown'}`);
        } catch (e) {
          console.log(`   Delivery attempts: Unable to check`);
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('💥 Error checking webhooks:', error.message);
  }
}

checkWebhooks().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 