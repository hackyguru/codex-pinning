import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/auth';
import { supabaseServer } from '../../../lib/supabase-server';

const deleteAccountHandler = withAuth(async (req, res) => {
  console.log('Delete account request received:', req.method);
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.id;
    console.log('User ID from auth:', userId);

    // First, get all user files to unpin them from storage
    console.log('Fetching user files for deletion...');
    const { data: userFiles, error: filesError } = await supabaseServer
      .from('files')
      .select('id, cid, filename')
      .eq('user_id', userId);

    if (filesError) {
      console.error('Error fetching user files for deletion:', filesError);
      return res.status(500).json({ error: 'Failed to fetch user files', details: filesError.message });
    }

    console.log(`Found ${userFiles?.length || 0} files to delete for user ${userId}`);

    // Unpin files from Codex network
    console.log('Starting Codex file unpinning process...');
    if (userFiles && userFiles.length > 0) {
      for (const file of userFiles) {
        try {
          console.log(`Attempting to unpin file: ${file.filename} (${file.cid})`);
          // Attempt to unpin the file from the Codex network
          // Note: This assumes you have a Codex API endpoint for unpinning
          const unpinResponse = await fetch(`${process.env.CODEX_API_URL || 'http://localhost:8080'}/api/codex/v1/data/${file.cid}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!unpinResponse.ok) {
            console.warn(`Failed to unpin file ${file.cid} from Codex network:`, unpinResponse.statusText);
            // Continue with deletion even if unpinning fails
          } else {
            console.log(`Successfully unpinned file ${file.filename} (${file.cid}) from Codex network`);
          }
        } catch (unpinError) {
          console.warn(`Error unpinning file ${file.cid}:`, unpinError);
          // Continue with deletion even if unpinning fails
        }
      }
    } else {
      console.log('No files found to unpin from Codex network');
    }

    // Now delete all user data from database
    console.log('Deleting user data from database...');
    
    // For now, let's manually delete the records instead of using the SQL function
    // since the function might not exist in the database yet
    try {
      // Delete user files
      const { error: filesDeleteError } = await supabaseServer
        .from('files')
        .delete()
        .eq('user_id', userId);
      
      if (filesDeleteError) {
        console.error('Error deleting user files:', filesDeleteError);
      }

      // Delete pinning secrets
      const { error: secretsDeleteError } = await supabaseServer
        .from('pinning_secrets')
        .delete()
        .eq('user_id', userId);
      
      if (secretsDeleteError) {
        console.error('Error deleting pinning secrets:', secretsDeleteError);
      }

      // Delete user record
      const { error: userDeleteError } = await supabaseServer
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (userDeleteError) {
        console.error('Error deleting user record:', userDeleteError);
        return res.status(500).json({ error: 'Failed to delete user account', details: userDeleteError.message });
      }

      console.log('Successfully deleted user account and all data');
      
    } catch (dbError) {
      console.error('Database deletion error:', dbError);
      return res.status(500).json({ error: 'Failed to delete account from database', details: dbError });
    }

    // If using Stripe, cancel their subscription
    console.log('Checking for Stripe subscriptions to cancel...');
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Get user's Stripe customer ID from the database (if it exists)
        const { data: userData } = await supabaseServer
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        if (userData?.stripe_customer_id) {
          console.log(`Found Stripe customer ID: ${userData.stripe_customer_id}`);
          // Cancel all active subscriptions
          const subscriptions = await stripe.subscriptions.list({
            customer: userData.stripe_customer_id,
            status: 'active'
          });

          console.log(`Found ${subscriptions.data.length} active subscriptions to cancel`);
          for (const subscription of subscriptions.data) {
            await stripe.subscriptions.del(subscription.id);
            console.log(`Cancelled subscription: ${subscription.id}`);
          }
        } else {
          console.log('No Stripe customer ID found for user');
        }
      } catch (stripeError) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Don't fail the account deletion if Stripe cleanup fails
      }
    } else {
      console.log('No Stripe secret key configured, skipping subscription cancellation');
    }

    console.log('Account deletion completed successfully');
    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error in delete account handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error stack:', errorStack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
});

export default deleteAccountHandler; 