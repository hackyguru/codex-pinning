import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/auth';
import { PinningSecretService } from '../../../lib/pinningSecretService';

const listPinningSecretsHandler = withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;

  try {
    const secrets = await PinningSecretService.getUserPinningSecrets(userId);

    // Format the response to not include sensitive data
    const formattedSecrets = secrets.map(secret => ({
      id: secret.id,
      name: secret.name,
      prefix: secret.secret_prefix,
      scopes: secret.scopes,
      rateLimitPerMinute: secret.rate_limit_per_minute,
      monthlyQuotaGb: secret.monthly_quota_gb,
      usageThisMonth: secret.usage_this_month,
      isActive: secret.is_active,
      lastUsed: secret.last_used_display,
      createdAt: new Date(secret.created_at).toLocaleDateString()
    }));

    return res.status(200).json({
      success: true,
      secrets: formattedSecrets,
      count: formattedSecrets.length
    });

  } catch (error) {
    console.error('Error listing pinning secrets:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default listPinningSecretsHandler; 