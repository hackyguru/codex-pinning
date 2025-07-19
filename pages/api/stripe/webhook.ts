import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseServer } from '../../../lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // Read the raw body from the request
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);
    
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    // Safe date conversion function
    const safeConvertDate = (timestamp: number | null | undefined): string | null => {
      if (!timestamp) return null;
      try {
        return new Date(timestamp * 1000).toISOString();
      } catch {
        return null;
      }
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId;
          const planType = session.metadata?.planType;
          
          if (!userId || !planType) {
            console.error('Missing metadata in checkout session');
            break;
          }

          // Get the subscription from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Create subscription record first (primary source of truth)
          const { data: subscriptionData, error: subscriptionError } = await supabaseServer
            .from('subscriptions')
            .upsert({
              user_id: userId,
              plan_type: planType,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              status: subscription.status,
              current_period_start: safeConvertDate((subscription as any).current_period_start),
              current_period_end: safeConvertDate((subscription as any).current_period_end),
              cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            })
            .select()
            .single();

          if (subscriptionError) {
            console.error('Failed to create subscription record:', subscriptionError);
            throw new Error('Subscription creation failed');
          }

          // Update user plan as backup (keep for backward compatibility)
          const { error: userUpdateError } = await supabaseServer
            .from('users')
            .update({ 
              plan_type: planType,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (userUpdateError) {
            console.error('Failed to update user plan:', userUpdateError);
            // Don't throw here as subscription is already created
          }

          console.log(`User ${userId} upgraded to ${planType} plan`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if ((invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
          const customerId = subscription.customer as string;
          
          // Get user from customer ID
          const { data: subData } = await supabaseServer
            .from('subscriptions')
            .select('user_id, plan_type')
            .eq('stripe_customer_id', customerId)
            .single();

          if (subData) {
            // Record billing history
            await supabaseServer
              .from('billing_history')
              .insert({
                user_id: subData.user_id,
                stripe_invoice_id: invoice.id,
                amount_cents: invoice.amount_paid,
                currency: invoice.currency,
                status: 'paid',
                plan_type: subData.plan_type,
                            billing_period_start: safeConvertDate(invoice.period_start),
            billing_period_end: safeConvertDate(invoice.period_end),
            paid_at: safeConvertDate(invoice.status_transitions.paid_at)
              });

            console.log(`Payment recorded for user ${subData.user_id}: $${invoice.amount_paid / 100}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if ((invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
          const customerId = subscription.customer as string;
          
          // Get user from customer ID
          const { data: subData } = await supabaseServer
            .from('subscriptions')
            .select('user_id, plan_type')
            .eq('stripe_customer_id', customerId)
            .single();

          if (subData) {
            // Record failed payment
            await supabaseServer
              .from('billing_history')
              .insert({
                user_id: subData.user_id,
                stripe_invoice_id: invoice.id,
                amount_cents: invoice.amount_due,
                currency: invoice.currency,
                status: 'failed',
                plan_type: subData.plan_type,
                            billing_period_start: safeConvertDate(invoice.period_start),
            billing_period_end: safeConvertDate(invoice.period_end)
              });

            // Update subscription status
            await supabaseServer
              .from('subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_customer_id', customerId);

            console.log(`Payment failed for user ${subData.user_id}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription status
        await supabaseServer
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: safeConvertDate((subscription as any).current_period_start),
            current_period_end: safeConvertDate((subscription as any).current_period_end),
            cancel_at_period_end: (subscription as any).cancel_at_period_end,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        console.log(`Subscription ${subscription.id} updated`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get user from subscription
        const { data: subData } = await supabaseServer
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subData) {
          // Update subscription status first (primary source of truth)
          const { error: subscriptionError } = await supabaseServer
            .from('subscriptions')
            .update({
              plan_type: 'free',
              status: 'canceled',
              stripe_subscription_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', subData.user_id);

          if (subscriptionError) {
            console.error('Failed to update subscription status:', subscriptionError);
          }

          // Update user plan as backup (keep for backward compatibility)
          const { error: userUpdateError } = await supabaseServer
            .from('users')
            .update({ 
              plan_type: 'free',
              updated_at: new Date().toISOString()
            })
            .eq('id', subData.user_id);

          if (userUpdateError) {
            console.error('Failed to update user plan:', userUpdateError);
          }

          console.log(`User ${subData.user_id} downgraded to free plan`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
} 