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
  req: unknown,
  res: unknown
) {
  if (req === null || req === undefined || typeof req !== 'object' || !('method' in req)) {
    return res === null || res === undefined || typeof res !== 'object' || !('status' in res)
      ? res
      : res.status(400).json({ error: 'Invalid request object' });
  }
  const reqObj = req as { method: string };
  if (reqObj.method !== 'POST') {
    return res === null || res === undefined || typeof res !== 'object' || !('status' in res)
      ? res
      : res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = (req as { headers: { 'stripe-signature': string } }).headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // Read the raw body from the request
    const chunks: Buffer[] = [];
    for await (const chunk of req as unknown as AsyncIterable<string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);
    
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
    console.log(`📡 Webhook received: ${event.type} (${event.id})`);
  } catch (err: unknown) {
    const error = err as Stripe.errors.StripeWebhookError;
    console.error('❌ Webhook signature verification failed:', error.message);
    return res === null || res === undefined || typeof res !== 'object' || !('status' in res)
      ? res
      : res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    // Safe date conversion function
    const safeConvertDate = (timestamp: number | null | undefined): string | null => {
      if (!timestamp) return null;
      try {
        return new Date(timestamp * 1000).toISOString();
      } catch {
        console.warn(`⚠️  Invalid timestamp: ${timestamp}`);
        return null;
      }
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`🛒 Processing checkout session: ${session.id}`);
        
        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId;
          const planType = session.metadata?.planType;
          
          if (!userId || !planType) {
            console.error(`❌ Missing metadata in checkout session ${session.id}:`, {
              userId,
              planType,
              metadata: session.metadata
            });
            // Still return 200 to acknowledge receipt
            return res === null || res === undefined || typeof res !== 'object' || !('status' in res)
              ? res
              : res.status(200).json({ 
                received: true, 
                error: 'Missing metadata - manual sync required' 
              });
          }

          console.log(`👤 Upgrading user ${userId} to ${planType} plan`);

          // Get the subscription from Stripe with retry logic
          let subscription!: Stripe.Subscription; // Definite assignment assertion
          let retries = 3;
          while (retries > 0) {
            try {
              subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              break;
            } catch (error: unknown) {
              console.warn(`⚠️  Retry ${4 - retries}: Failed to retrieve subscription ${session.subscription}`);
              retries--;
              if (retries === 0) {
                console.error(`❌ Failed to retrieve subscription after 3 retries: ${session.subscription}`);
                throw error;
              }
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            }
          }
          
          // Update subscription record (SINGLE source of truth)
          console.log(`💾 Updating subscription record for ${userId}`);
          const { error: subscriptionError } = await supabaseServer
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
            });

          if (subscriptionError) {
            console.error(`❌ Failed to update subscription record for ${userId}:`, subscriptionError);
            throw new Error('Subscription update failed');
          } else {
            console.log(`✅ Subscription record updated for ${userId}`);
          }

          console.log(`🎉 User ${userId} successfully upgraded to ${planType} plan`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💳 Processing successful payment: ${invoice.id}`);
        
        if ((invoice as unknown as Stripe.Invoice).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as unknown as Stripe.Invoice).subscription as string);
          const customerId = subscription.customer as string;
          
          // Get user from customer ID
          const { data: subData } = await supabaseServer
            .from('subscriptions')
            .select('user_id, plan_type')
            .eq('stripe_customer_id', customerId)
            .single();

          if (subData) {
            // Record billing history
            const { error: billingError } = await supabaseServer
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

            if (billingError) {
              console.error(`❌ Failed to record billing history for ${subData.user_id}:`, billingError);
            } else {
              console.log(`💰 Payment recorded for user ${subData.user_id}: $${invoice.amount_paid / 100}`);
            }
          } else {
            console.warn(`⚠️  No subscription found for customer ${customerId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💸 Processing failed payment: ${invoice.id}`);
        
        if ((invoice as unknown as Stripe.Invoice).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as unknown as Stripe.Invoice).subscription as string);
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

            // IMMEDIATELY downgrade user to free plan on payment failure
            await supabaseServer
              .from('subscriptions')
              .update({
                plan_type: 'free',
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_customer_id', customerId);

            console.log(`⬇️  Payment failed for user ${subData.user_id} - DOWNGRADED TO FREE`);
          }
        }
        break;
      }

      case 'invoice.payment_action_required': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`⚠️  Payment action required: ${invoice.id}`);
        
        if ((invoice as unknown as Stripe.Invoice).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as unknown as Stripe.Invoice).subscription as string);
          const customerId = subscription.customer as string;
          
          // Get user from customer ID
          const { data: subData } = await supabaseServer
            .from('subscriptions')
            .select('user_id, plan_type')
            .eq('stripe_customer_id', customerId)
            .single();

          if (subData) {
            // Update subscription status to incomplete (but don't downgrade yet)
            await supabaseServer
              .from('subscriptions')
              .update({
                status: 'incomplete',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_customer_id', customerId);

            console.log(`⏳ Payment action required for user ${subData.user_id} - marked as incomplete`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🔄 Processing subscription update: ${subscription.id}`);
        
        // Get user from subscription
        const { data: subData } = await supabaseServer
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        // Update subscription status
        const { error: updateError } = await supabaseServer
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: safeConvertDate((subscription as any).current_period_start),
            current_period_end: safeConvertDate((subscription as any).current_period_end),
            cancel_at_period_end: (subscription as any).cancel_at_period_end,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error(`❌ Failed to update subscription ${subscription.id}:`, updateError);
        }

        // If subscription is marked for cancellation, update subscription to free
        if (subData && (subscription as any).cancel_at_period_end) {
          await supabaseServer
            .from('subscriptions')
            .update({ 
              plan_type: 'free',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', subData.user_id);

          console.log(`⬇️  User ${subData.user_id} downgraded due to subscription cancellation`);
        }

        console.log(`✅ Subscription ${subscription.id} updated`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🗑️  Processing subscription deletion: ${subscription.id}`);
        
        // Get user from subscription
        const { data: subData } = await supabaseServer
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subData) {
          // Update subscription status (SINGLE source of truth)
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
            console.error(`❌ Failed to update subscription status for ${subData.user_id}:`, subscriptionError);
          }

          console.log(`⬇️  User ${subData.user_id} downgraded to free plan`);
        }
        break;
      }

      default:
        console.log(`❓ Unhandled event type: ${event.type}`);
    }

    console.log(`✅ Webhook ${event.type} processed successfully`);
    return res === null || res === undefined || typeof res !== 'object' || !('status' in res)
      ? res
      : res.status(200).json({ received: true, eventId: event.id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`💥 Webhook processing error for ${event.type}:`, err);
    console.error('Stack trace:', err.stack);
    
    // Return 200 to prevent Stripe from retrying (since we've logged the error)
    // In production, you might want to return 500 for retryable errors
    return res === null || res === undefined || typeof res !== 'object' || !('status' in res)
      ? res
      : res.status(200).json({ 
        received: true, 
        error: 'Processing failed - manual intervention required',
        eventId: event.id 
      });
  }
} 