import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseServer } from '../../../lib/supabase-server';
import { withAuth } from '../../../lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const cancelSubscriptionHandler = withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use authenticated user ID - NO user input accepted!
    const userId = req.user.id;

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabaseServer
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    // Debug: Check all subscriptions for this user
    const { data: allSubscriptions } = await supabaseServer
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    console.log(`Debug: All subscriptions for user ${userId}:`, allSubscriptions);

    // Debug: Check user's current plan
    const { data: user } = await supabaseServer
      .from('users')
      .select('plan_type')
      .eq('id', userId)
      .single();
    
    console.log(`Debug: User ${userId} current plan:`, user?.plan_type);

    if (!subscription) {
      // If no subscription but user is on paid plan, offer manual downgrade
      if (user?.plan_type === 'pro' || user?.plan_type === 'enterprise') {
        console.log(`User ${userId} has plan ${user.plan_type} but no subscription record. Performing manual downgrade.`);
        
        // Manually downgrade user to free
        const { error: updateError } = await supabaseServer
          .from('users')
          .update({ 
            plan_type: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user plan:', updateError);
          return res.status(500).json({ error: 'Failed to update user plan' });
        }

        // Create billing history for manual downgrade
        await supabaseServer
          .from('billing_history')
          .insert({
            user_id: userId,
            amount: 0,
            currency: 'usd',
            status: 'manual_downgrade',
            plan_type: 'free',
            description: 'Manual downgrade due to missing subscription record',
            created_at: new Date().toISOString()
          });

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully downgraded to free plan (manual)' 
        });
      }
      
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel the subscription in Stripe (at period end)
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Update subscription status in database
    const { error: updateSubError } = await supabaseServer
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateSubError) {
      console.error('Error updating subscription:', updateSubError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    // Update user plan to free immediately (since they requested downgrade)
    const { error: updateUserError } = await supabaseServer
      .from('users')
      .update({
        plan_type: 'free',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateUserError) {
      console.error('Error updating user plan:', updateUserError);
      return res.status(500).json({ error: 'Failed to update user plan' });
    }

    // Add billing history record
    const { error: billingError } = await supabaseServer
      .from('billing_history')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        amount: 0,
        description: 'Subscription cancelled - downgraded to Free plan',
        invoice_status: 'cancelled',
        created_at: new Date().toISOString()
      });

    if (billingError) {
      console.error('Error creating billing history:', billingError);
      // Don't return error here as the main operation succeeded
    }

    console.log(`User ${userId} successfully downgraded to free plan`);

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully downgraded to Free plan' 
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default cancelSubscriptionHandler; 