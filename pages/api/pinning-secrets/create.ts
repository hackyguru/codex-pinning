import { withAuth } from '../../../lib/auth';
import { PinningSecretService } from '../../../lib/pinningSecretService';

const createPinningSecretHandler = withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;
  const { name, scopes, rateLimitPerMinute, monthlyQuotaGb } = req.body;

  try {
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be less than 100 characters' });
    }

    // Validate scopes if provided
    if (scopes && !Array.isArray(scopes)) {
      return res.status(400).json({ error: 'Scopes must be an array' });
    }

    const validScopes = ['upload', 'download'];
    if (scopes && scopes.some((scope: string) => !validScopes.includes(scope))) {
      return res.status(400).json({ error: 'Invalid scope. Valid scopes are: upload, download' });
    }

    // Validate rate limit if provided
    if (rateLimitPerMinute && (typeof rateLimitPerMinute !== 'number' || rateLimitPerMinute < 1 || rateLimitPerMinute > 1000)) {
      return res.status(400).json({ error: 'Rate limit must be a number between 1 and 1000' });
    }

    // Validate monthly quota if provided
    if (monthlyQuotaGb && (typeof monthlyQuotaGb !== 'number' || monthlyQuotaGb < 1 || monthlyQuotaGb > 1000)) {
      return res.status(400).json({ error: 'Monthly quota must be a number between 1 and 1000 GB' });
    }

    // Check if user already has too many pinning secrets (limit to 10)
    const existingSecrets = await PinningSecretService.getUserPinningSecrets(userId);
    if (existingSecrets.length >= 10) {
      return res.status(400).json({ 
        error: 'Maximum number of pinning secrets reached', 
        message: 'You can have a maximum of 10 pinning secrets. Please revoke some existing ones first.' 
      });
    }

    // Create the pinning secret
    const result = await PinningSecretService.createPinningSecret({
      userId,
      name: name.trim(),
      scopes: scopes || ['upload', 'download'],
      rateLimitPerMinute: rateLimitPerMinute || 100,
      monthlyQuotaGb: monthlyQuotaGb || null
    });

    if (!result) {
      return res.status(500).json({ error: 'Failed to create pinning secret' });
    }

    // Return the secret (only shown once)
    return res.status(201).json({
      success: true,
      pinningSecret: result.secret, // Full secret - only shown once!
      secretInfo: {
        id: result.record.id,
        name: result.record.name,
        prefix: result.record.secret_prefix,
        scopes: result.record.scopes,
        rateLimitPerMinute: result.record.rate_limit_per_minute,
        monthlyQuotaGb: result.record.monthly_quota_gb,
        createdAt: result.record.created_at
      },
      message: 'Pinning secret created successfully. Please save it securely - it will not be shown again.'
    });

  } catch (error) {
    console.error('Error creating pinning secret:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default createPinningSecretHandler; 