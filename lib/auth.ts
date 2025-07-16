import { NextApiRequest, NextApiResponse } from 'next';
import { PrivyClient } from '@privy-io/server-auth';

// Initialize Privy client with your app credentials
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends NextApiRequest {
  user: AuthenticatedUser;
}

/**
 * Middleware to verify Privy JWT token and extract user info
 */
export async function verifyAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedUser | null> {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return null;
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token with Privy
    const verifiedClaims = await privy.verifyAuthToken(token);
    
    // Get user ID from the verified claims
    const userId = verifiedClaims.userId;
    
    // Fetch user details from Privy
    const user = await privy.getUser(userId);
    
    // Extract email from user's linked accounts
    let userEmail = '';
    
    if (user.email?.address) {
      userEmail = user.email.address;
    } else if (user.google?.email) {
      userEmail = user.google.email;
    } else if (user.twitter?.username) {
      userEmail = `${user.twitter.username}@twitter.placeholder`;
    } else if (user.discord?.username) {
      userEmail = `${user.discord.username}@discord.placeholder`;
    } else if (user.github?.username) {
      userEmail = `${user.github.username}@github.placeholder`;
    } else if (user.linkedin?.email) {
      userEmail = user.linkedin.email;
    } else if (user.wallet?.address) {
      userEmail = `${user.wallet.address}@wallet.placeholder`;
    } else {
      console.warn('No email found for user:', userId);
      userEmail = `${userId}@unknown.placeholder`;
    }

    return {
      id: userId,
      email: userEmail
    };
    
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

/**
 * Higher-order function to create authenticated API routes
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = await verifyAuth(req, res);
    
    if (!user) {
      // verifyAuth already sent an error response
      return;
    }
    
    // Add user to request object
    (req as AuthenticatedRequest).user = user;
    
    // Call the actual handler
    await handler(req as AuthenticatedRequest, res);
  };
} 