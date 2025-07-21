import { withAuth } from '../../../lib/auth';
import { supabaseServer } from '../../../lib/supabase-server';

const exportDataHandler = withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;

  try {
    // Get user account information
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Get user files with complete metadata
    const { data: filesData, error: filesError } = await supabaseServer
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error fetching files data:', filesError);
      return res.status(500).json({ error: 'Failed to fetch files data' });
    }

    // Get pinning secrets (excluding actual secret values for security)
    // Use a simpler select in case some columns don't exist
    const { data: secretsData, error: secretsError } = await supabaseServer
      .from('pinning_secrets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Note: Don't fail if pinning secrets doesn't exist or has errors
    if (secretsError) {
      console.warn('Could not fetch pinning secrets:', secretsError);
    }

    // Get allowed domains
    const { data: domainsData, error: domainsError } = await supabaseServer
      .from('api_domain_restrictions')
      .select('domain, created_at')
      .eq('user_id', userId)
      .order('domain');

    // Note: Don't fail if domains table doesn't exist or has errors
    if (domainsError) {
      console.warn('Could not fetch domain restrictions:', domainsError);
    }

    // Billing history is now retrieved from Stripe directly when needed

    // Prepare export notes about any missing data
    const exportNotes = [];
    if (secretsError) {
      exportNotes.push('Pinning secrets data could not be included due to database error');
    }
    if (domainsError) {
      exportNotes.push('API domain restrictions could not be included due to database error');
    }


    // Prepare export data
    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        export_version: '1.0',
        notes: exportNotes.length > 0 ? exportNotes : ['Complete data export - all sections included']
      },
      account: {
        id: userData.id,
        email: userData.email,
        plan_type: userData.plan_type,
        storage_limit: userData.storage_limit,
        created_at: userData.created_at,
        last_active: userData.last_active,
        stripe_customer_id: userData.stripe_customer_id ? '[REDACTED]' : null
      },
      files: filesData?.map(file => ({
        id: file.id,
        filename: file.filename,
        cid: file.cid,
        content_type: file.content_type,
        size: file.size,
        upload_method: file.upload_method,
        gateway_url: `https://gateway.thirdstorage.com/ipfs/${file.cid}`,
        created_at: file.created_at,
        metadata: file.metadata
      })) || [],
      pinning_secrets: (secretsData && !secretsError) ? secretsData.map(secret => ({
        id: secret.id || null,
        name: secret.name || null,
        scopes: secret.scopes || null,
        rate_limit_per_minute: secret.rate_limit_per_minute || null,
        monthly_quota_gb: secret.monthly_quota_gb || null,
        usage_this_month: secret.usage_this_month || null,
        is_active: secret.is_active || null,
        created_at: secret.created_at || null,
        last_used: secret.last_used || null,
        note: 'Secret values are not included for security reasons'
      })) : [],
      api_domain_restrictions: (domainsData && !domainsError) ? domainsData.map(domain => ({
        domain: domain.domain,
        created_at: domain.created_at
      })) : [],
      billing_history: [], // Now retrieved from Stripe directly when needed
      statistics: {
        total_files: filesData?.length || 0,
        total_storage_used: filesData?.reduce((total, file) => total + (file.size || 0), 0) || 0,
        total_pinning_secrets: (secretsData && !secretsError) ? secretsData.length : 0,
        total_domain_restrictions: (domainsData && !domainsError) ? domainsData.length : 0,
        oldest_file: filesData?.[filesData.length - 1]?.created_at || null,
        newest_file: filesData?.[0]?.created_at || null
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="thirdstorage-export-${new Date().toISOString().split('T')[0]}.json"`);

    return res.status(200).json(exportData);

  } catch (error) {
    console.error('Error in export data handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default exportDataHandler; 