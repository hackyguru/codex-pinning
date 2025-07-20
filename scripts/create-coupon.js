#!/usr/bin/env node

/**
 * Create Stripe Coupon Codes
 * 
 * Usage:
 *   node scripts/create-coupon.js
 *   
 * Make sure you have STRIPE_SECRET_KEY in your .env.local file
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createCoupon() {
  console.log('\n🎟️  Create a new Stripe coupon code\n');
  
  try {
    // Get coupon details from user
    const id = await ask('Coupon ID (e.g., SAVE50): ');
    const name = await ask('Coupon Name (e.g., "50% Off First Month"): ');
    
    const discountType = await ask('Discount Type (1=percentage, 2=fixed amount): ');
    
    let percentOff = null;
    let amountOff = null;
    
    if (discountType === '1') {
      percentOff = parseInt(await ask('Percentage Off (e.g., 50 for 50%): '));
    } else {
      amountOff = parseInt(await ask('Amount Off in cents (e.g., 500 for $5.00): '));
    }
    
    const duration = await ask('Duration (1=once, 2=forever, 3=repeating): ');
    let durationValue = 'once';
    let durationInMonths = null;
    
    if (duration === '2') {
      durationValue = 'forever';
    } else if (duration === '3') {
      durationValue = 'repeating';
      durationInMonths = parseInt(await ask('Duration in months: '));
    }
    
    const maxRedemptions = await ask('Max redemptions (leave empty for unlimited): ');
    const redeemByInput = await ask('Redeem by date (YYYY-MM-DD, leave empty for no expiry): ');
    
    // Prepare coupon data
    const couponData = {
      id: id.toUpperCase(),
      name: name,
      duration: durationValue,
    };
    
    if (percentOff) {
      couponData.percent_off = percentOff;
    } else {
      couponData.amount_off = amountOff;
      couponData.currency = 'usd';
    }
    
    if (durationInMonths) {
      couponData.duration_in_months = durationInMonths;
    }
    
    if (maxRedemptions) {
      couponData.max_redemptions = parseInt(maxRedemptions);
    }
    
    if (redeemByInput) {
      const redeemByDate = new Date(redeemByInput);
      couponData.redeem_by = Math.floor(redeemByDate.getTime() / 1000);
    }
    
    console.log('\n🔄 Creating coupon...\n');
    
    // Create the coupon
    const coupon = await stripe.coupons.create(couponData);
    
    console.log('✅ Coupon created successfully!');
    console.log('\n📋 Coupon Details:');
    console.log(`   ID: ${coupon.id}`);
    console.log(`   Name: ${coupon.name}`);
    if (coupon.percent_off) {
      console.log(`   Discount: ${coupon.percent_off}% off`);
    } else {
      console.log(`   Discount: $${(coupon.amount_off / 100).toFixed(2)} off`);
    }
    console.log(`   Duration: ${coupon.duration}`);
    if (coupon.duration_in_months) {
      console.log(`   Duration: ${coupon.duration_in_months} months`);
    }
    if (coupon.max_redemptions) {
      console.log(`   Max Redemptions: ${coupon.max_redemptions}`);
    }
    if (coupon.redeem_by) {
      console.log(`   Expires: ${new Date(coupon.redeem_by * 1000).toLocaleDateString()}`);
    }
    console.log(`   Valid: ${coupon.valid}`);
    
    console.log('\n🧪 Test the coupon in your dashboard now!');
    
  } catch (error) {
    console.error('\n❌ Error creating coupon:', error.message);
    
    if (error.code === 'resource_already_exists') {
      console.log('\n💡 Tip: Try a different coupon ID as this one already exists.');
    }
  }
  
  rl.close();
}

async function listCoupons() {
  console.log('\n📋 Existing Coupons:\n');
  
  try {
    const coupons = await stripe.coupons.list({ limit: 10 });
    
    if (coupons.data.length === 0) {
      console.log('   No coupons found.');
    } else {
      coupons.data.forEach((coupon) => {
        const discount = coupon.percent_off ? 
          `${coupon.percent_off}% off` : 
          `$${(coupon.amount_off / 100).toFixed(2)} off`;
        
        const status = coupon.valid ? '✅ Active' : '❌ Inactive';
        
        console.log(`   ${coupon.id} - ${coupon.name || 'Unnamed'}`);
        console.log(`     Discount: ${discount}`);
        console.log(`     Duration: ${coupon.duration}`);
        console.log(`     Status: ${status}`);
        console.log(`     Times Used: ${coupon.times_redeemed || 0}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error fetching coupons:', error.message);
  }
}

async function main() {
  console.log('🎟️  Stripe Coupon Manager\n');
  
  const action = await ask('What would you like to do?\n1. Create new coupon\n2. List existing coupons\n\nChoice (1 or 2): ');
  
  if (action === '1') {
    await createCoupon();
  } else if (action === '2') {
    await listCoupons();
    rl.close();
  } else {
    console.log('❌ Invalid choice. Please run the script again.');
    rl.close();
  }
}

main().catch(console.error); 