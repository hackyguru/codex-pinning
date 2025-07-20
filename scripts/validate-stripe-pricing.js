const Stripe = require('stripe');
const { getPlan } = require('../lib/plans');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function validateStripePricing() {
  console.log('🔍 Validating pricing sync between local config and Stripe...\n');

  try {
    // Get current Stripe prices
    const prices = await stripe.prices.list({ limit: 100 });
    
    // Expected price mapping (update these with your actual Stripe price IDs)
    const EXPECTED_PRICES = {
      'price_1Rn5TA2KEd69VSVpDgMHPMxJ': { plan: 'pro', expected: 1000 }, // $10.00
      // Add more as needed
    };

    console.log('📋 Checking pricing consistency...');
    
    let allGood = true;
    
    for (const [priceId, config] of Object.entries(EXPECTED_PRICES)) {
      const stripePrice = prices.data.find(p => p.id === priceId);
      const localPlan = getPlan(config.plan);
      
      if (!stripePrice) {
        console.log(`❌ Price ${priceId} not found in Stripe`);
        allGood = false;
        continue;
      }

      if (stripePrice.unit_amount !== config.expected) {
        console.log(`⚠️  PRICE MISMATCH for ${config.plan}:`);
        console.log(`   Local: $${config.expected / 100}`);
        console.log(`   Stripe: $${stripePrice.unit_amount / 100}`);
        console.log(`   Price ID: ${priceId}`);
        allGood = false;
      } else {
        console.log(`✅ ${config.plan}: $${stripePrice.unit_amount / 100} (in sync)`);
      }
    }

    if (allGood) {
      console.log('\n🎉 All pricing is in sync!');
    } else {
      console.log('\n⚠️  Pricing inconsistencies found. Please update:');
      console.log('1. lib/plans.ts (local config)');
      console.log('2. OR Stripe dashboard (if Stripe should change)');
    }

    // Also check for orphaned prices
    console.log('\n📋 All Stripe prices:');
    prices.data.forEach(price => {
      const product = price.product;
      console.log(`   ${price.id}: $${price.unit_amount / 100} (${price.nickname || 'No nickname'}) - Product: ${typeof product === 'string' ? product : product.id}`);
    });

  } catch (error) {
    console.error('💥 Validation failed:', error);
  }
}

// Run validation
validateStripePricing().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

// Export for use in other scripts
module.exports = { validateStripePricing }; 