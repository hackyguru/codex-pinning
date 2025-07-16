import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/auth';
import { PinningSecretService } from '../../../lib/pinningSecretService';

const revokePinningSecretHandler = withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;
  const { secretId } = req.body;

  try {
    // Validate required fields
    if (!secretId || typeof secretId !== 'string') {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    // Revoke the secret
    const success = await PinningSecretService.revokePinningSecret(secretId, userId);

    if (!success) {
      return res.status(404).json({ error: 'Pinning secret not found or already revoked' });
    }

    return res.status(200).json({
      success: true,
      message: 'Pinning secret revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking pinning secret:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default revokePinningSecretHandler; 