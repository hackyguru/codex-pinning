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
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel the subscription in Stripe (at period end)
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Update subscription status in database (SINGLE source of truth)
    const { error: updateSubError } = await supabaseServer
      .from('subscriptions')
      .update({
        plan_type: 'free',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateSubError) {
      console.error('Error updating subscription:', updateSubError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    // Billing history is now handled by Stripe invoices only

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