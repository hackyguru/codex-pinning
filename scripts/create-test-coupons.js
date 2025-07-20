const Stripe = require('stripe');
require('dotenv').config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createTestCoupons() {
  console.log('🎫 Creating test coupon codes in Stripe...\n');

  const coupons = [
    {
      id: 'FREE',
      percent_off: 100,
      duration: 'once',
      name: 'Free First Month',
      max_redemptions: 100,
    },
    {
      id: 'FREEMONTH',
      percent_off: 100,
      duration: 'once', 
      name: 'Free Month Promotion',
      max_redemptions: 50,
    },
    {
      id: 'SAVE50',
      percent_off: 50,
      duration: 'once',
      name: '50% Off First Month',
      max_redemptions: 200,
    },
    {
      id: 'WELCOME10',
      percent_off: 10,
      duration: 'repeating',
      duration_in_months: 3,
      name: '10% Off for 3 Months',
      max_redemptions: 1000,
    },
    {
      id: 'STUDENT',
      amount_off: 500, // $5.00 off
      currency: 'usd',
      duration: 'repeating',
      duration_in_months: 12,
      name: 'Student Discount',
      max_redemptions: 500,
    }
  ];

  for (const couponData of coupons) {
    try {
      // Check if coupon already exists
      try {
        const existing = await stripe.coupons.retrieve(couponData.id);
        console.log(`✅ Coupon '${couponData.id}' already exists`);
        continue;
      } catch (error) {
        if (error.code !== 'resource_missing') {
          throw error;
        }
        // Coupon doesn't exist, create it
      }

      const coupon = await stripe.coupons.create(couponData);
      
      console.log(`🎉 Created coupon: ${coupon.id}`);
      console.log(`   Name: ${coupon.name}`);
      if (coupon.percent_off) {
        console.log(`   Discount: ${coupon.percent_off}% off`);
      }
      if (coupon.amount_off) {
        console.log(`   Discount: $${coupon.amount_off / 100} off`);
      }
      console.log(`   Duration: ${coupon.duration}`);
      if (coupon.duration_in_months) {
        console.log(`   Months: ${coupon.duration_in_months}`);
      }
      console.log(`   Max redemptions: ${coupon.max_redemptions}`);
      console.log('');

    } catch (error) {
      console.error(`❌ Failed to create coupon '${couponData.id}':`, error.message);
    }
  }

  console.log('✨ Test coupon creation completed!\n');
  
  // List all active coupons
  console.log('📋 All active coupons in your Stripe account:');
  try {
    const allCoupons = await stripe.coupons.list({ limit: 20 });
    
    if (allCoupons.data.length === 0) {
      console.log('   No coupons found.');
    } else {
      allCoupons.data.forEach(coupon => {
        const discount = coupon.percent_off 
          ? `${coupon.percent_off}% off`
          : `$${coupon.amount_off / 100} off`;
        
        console.log(`   ${coupon.id} - ${discount} (${coupon.name})`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to list coupons:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  createTestCoupons().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { createTestCoupons }; 