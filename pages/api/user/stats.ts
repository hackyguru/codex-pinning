import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/auth';
import { UserService } from '../../../lib/userService';

const userStatsHandler = withAuth(async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from JWT verification
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Try to get user stats from database
    let stats = await UserService.getUserStats(userId);

    // If user doesn't exist, create their profile first
    if (!stats) {
      console.log(`Creating user profile for ${userId} on first dashboard access`);
      await UserService.upsertUserProfile(userId, userEmail);
      stats = await UserService.getUserStats(userId);
    }

    if (!stats) {
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default userStatsHandler; 