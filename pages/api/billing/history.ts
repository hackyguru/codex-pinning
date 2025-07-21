import Stripe from 'stripe';
import { supabaseServer } from '../../../lib/supabase-server';
import { withAuth } from '../../../lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

interface BillingHistoryItem {
  id: string;
  date: string;
  amount: string;
  status: string;
  plan: string;
  period: string;
  invoice_url?: string;
  invoice_pdf?: string;
}

const billingHistoryHandler = withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user ID - NO user input accepted!
    const userId = req.user.id;

    // Get user's subscription to find Stripe customer ID
    const { data: subscription } = await supabaseServer
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let stripeInvoices: BillingHistoryItem[] = [];

    // Fetch invoices from Stripe if customer exists
    if (subscription?.stripe_customer_id) {
      const invoices = await stripe.invoices.list({
        customer: subscription.stripe_customer_id,
        limit: 10, // Last 10 invoices
        status: 'paid', // Only show paid invoices
      });

      // Transform Stripe invoices into our billing history format
              stripeInvoices = invoices.data
        .filter((invoice): invoice is Stripe.Invoice & { id: string } => Boolean(invoice.id))
        .map((invoice) => {
          // Get the subscription line item to determine plan
          const subscriptionItem = invoice.lines.data.find(
            (line) => line.subscription
          );
          
          // Format amount
          const amount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: invoice.currency.toUpperCase(),
          }).format(invoice.amount_paid / 100);

          // Format date
          const date = new Date(invoice.created * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          // Format billing period
          let period = '';
          if (invoice.period_start && invoice.period_end) {
            const startDate = new Date(invoice.period_start * 1000);
            const endDate = new Date(invoice.period_end * 1000);
            
            const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            if (startMonth === endMonth) {
              period = startMonth;
            } else {
              period = `${startMonth} - ${endMonth}`;
            }
          }

          // Determine plan name from description or metadata
          let planName = 'Pro Plan'; // Default
          if (subscriptionItem?.description) {
            if (subscriptionItem.description.toLowerCase().includes('enterprise')) {
              planName = 'Enterprise Plan';
            } else if (subscriptionItem.description.toLowerCase().includes('pro')) {
              planName = 'Pro Plan';
            }
          }

          return {
            id: invoice.id,
            date,
            amount,
            status: invoice.status || 'unknown',
            plan: planName,
            period: period || date,
            invoice_url: invoice.hosted_invoice_url || undefined,
            invoice_pdf: invoice.invoice_pdf || undefined,
          };
        });
    }

    // Return only Stripe invoices (single source of truth)
    const allHistory = stripeInvoices;

    res.status(200).json({ billingHistory: allHistory });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

export default billingHistoryHandler; 