import { withAuth } from '../../../lib/auth';
import { supabaseServer } from '../../../lib/supabase-server';

const allowedDomainsHandler = withAuth(async (req, res) => {
  const userId = req.user.id;

  try {
    if (req.method === 'GET') {
      // Get allowed domains for user
      const { data, error } = await supabaseServer
        .from('api_domain_restrictions')
        .select('domain')
        .eq('user_id', userId)
        .order('domain');

      if (error) {
        console.error('Error fetching domains:', error);
        return res.status(500).json({ error: 'Failed to fetch domains' });
      }

      const domains = data?.map(row => row.domain) || [];
      return res.status(200).json({ domains });

    } else if (req.method === 'POST') {
      // Add new domain
      const { domain } = req.body;

      if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ error: 'Domain is required' });
      }

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(domain)) {
        return res.status(400).json({ error: 'Invalid domain format' });
      }

      // Check if domain already exists
      const { data: existing } = await supabaseServer
        .from('api_domain_restrictions')
        .select('id')
        .eq('user_id', userId)
        .eq('domain', domain)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Domain already exists' });
      }

      // Add domain
      const { error: insertError } = await supabaseServer
        .from('api_domain_restrictions')
        .insert({
          user_id: userId,
          domain: domain.toLowerCase()
        });

      if (insertError) {
        console.error('Error adding domain:', insertError);
        return res.status(500).json({ error: 'Failed to add domain' });
      }

      // Return updated list
      const { data: updatedData, error: fetchError } = await supabaseServer
        .from('api_domain_restrictions')
        .select('domain')
        .eq('user_id', userId)
        .order('domain');

      if (fetchError) {
        console.error('Error fetching updated domains:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch updated domains' });
      }

      const domains = updatedData?.map(row => row.domain) || [];
      return res.status(200).json({ domains });

    } else if (req.method === 'DELETE') {
      // Remove domain
      const { domain } = req.body;

      if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ error: 'Domain is required' });
      }

      const { error: deleteError } = await supabaseServer
        .from('api_domain_restrictions')
        .delete()
        .eq('user_id', userId)
        .eq('domain', domain);

      if (deleteError) {
        console.error('Error removing domain:', deleteError);
        return res.status(500).json({ error: 'Failed to remove domain' });
      }

      // Return updated list
      const { data: updatedData, error: fetchError } = await supabaseServer
        .from('api_domain_restrictions')
        .select('domain')
        .eq('user_id', userId)
        .order('domain');

      if (fetchError) {
        console.error('Error fetching updated domains:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch updated domains' });
      }

      const domains = updatedData?.map(row => row.domain) || [];
      return res.status(200).json({ domains });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in allowed domains handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default allowedDomainsHandler; 