import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow HEAD and GET requests for health checks
  if (req.method !== 'HEAD' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Basic health check - just return 200 if the API is responding
    // In a real implementation, you might want to check:
    // - Database connectivity
    // - External service availability
    // - System resources
    
    // For now, we'll just check if we can respond
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'gateway'
    };

    // For HEAD requests, just return status code
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // For GET requests, return the health status object
    return res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    
    if (req.method === 'HEAD') {
      return res.status(503).end();
    }
    
    return res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
} 