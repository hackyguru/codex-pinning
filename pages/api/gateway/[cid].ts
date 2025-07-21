import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../../lib/supabase-server';
import { 
  gatewayRateLimiter, 
  aggressiveRateLimiter, 
  burstRateLimiter,
  getClientIP, 
  detectSuspiciousActivity 
} from '../../../lib/rateLimiter';

// Helper function to detect if request is from a browser
const isBrowserRequest = (req: NextApiRequest): boolean => {
  const userAgent = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  
  // Check if it's a browser request (not API/programmatic)
  return accept.includes('text/html') && 
         (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari') || userAgent.includes('Firefox'));
};

const gatewayHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIP = getClientIP(req);
  const isSuspicious = detectSuspiciousActivity(req);

  // Apply rate limiting based on activity type
  let rateLimitResult;
  if (isSuspicious) {
    // More aggressive rate limiting for suspicious requests
    rateLimitResult = aggressiveRateLimiter.check(clientIP);
  } else {
    // Also check burst rate limiting (short window)
    const burstResult = burstRateLimiter.check(clientIP);
    if (!burstResult.allowed) {
      rateLimitResult = burstResult;
    } else {
      // Normal rate limiting
      rateLimitResult = gatewayRateLimiter.check(clientIP);
    }
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', isSuspicious ? 10 : 60);
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000));

  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);

    // Log suspicious activity
    if (isSuspicious) {
      console.warn(`Suspicious activity blocked from IP: ${clientIP}, User-Agent: ${req.headers['user-agent']}`);
    }

    // If it's a browser request, redirect to our nice error page with rate limit info
    if (isBrowserRequest(req)) {
      return res.redirect(302, `/gateway/rate-limited`);
    }

    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
      suspicious: isSuspicious
    });
  }

  const { cid } = req.query;

  // Validate CID parameter
  if (!cid || typeof cid !== 'string') {
    // If it's a browser request, redirect to our nice error page
    if (isBrowserRequest(req)) {
      return res.redirect(302, `/gateway/${cid || 'invalid'}`);
    }
    return res.status(400).json({ error: 'Invalid or missing CID parameter' });
  }

  try {
    // Check if the CID exists in our database (for basic validation)
    const { data: fileRecord, error: dbError } = await supabaseServer
      .from('files')
      .select('filename, content_type')
      .eq('cid', cid)
      .single();

    if (dbError || !fileRecord) {
      // Even if not in our DB, try to fetch from Codex anyway
      console.log(`CID ${cid} not found in database, trying Codex directly`);
    }

    // Get Codex API credentials from environment variables
    // Required env vars: CODEX_API_URL, CODEX_USERNAME, CODEX_PASSWORD
    const codexApiUrl = process.env.CODEX_API_URL;
    const codexUsername = process.env.CODEX_USERNAME;
    const codexPassword = process.env.CODEX_PASSWORD;

    if (!codexPassword) {
      return res.status(500).json({ error: 'Storage service configuration missing' });
    }

    // Create basic auth header for Codex API
    const basicAuth = Buffer.from(`${codexUsername}:${codexPassword}`).toString('base64');
    
    // Construct the Codex API URL for streaming content
    const codexUrl = `${codexApiUrl}/data/${cid}/network/stream`;
    
    console.log(`Public gateway fetching: ${codexUrl}`);

    // Make request to Codex API with basic auth
    const codexResponse = await fetch(codexUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'User-Agent': 'ThirdStorage-Gateway/1.0',
      },
    });

    // Handle Codex API errors
    if (!codexResponse.ok) {
      console.error(`Codex API error: ${codexResponse.status} ${codexResponse.statusText}`);
      
      // If it's a browser request, redirect to our nice error page
      if (isBrowserRequest(req)) {
        return res.redirect(302, `/gateway/${cid}`);
      }
      
      // Otherwise return JSON for API clients
      if (codexResponse.status === 400) {
        return res.status(400).json({ error: 'Invalid CID specified' });
      } else if (codexResponse.status === 404) {
        return res.status(404).json({ error: 'Content not found on Codex network' });
      } else if (codexResponse.status === 500) {
        return res.status(500).json({ error: 'Internal server error from Codex' });
      } else if (codexResponse.status === 401) {
        return res.status(500).json({ error: 'Authentication failed' });
      } else {
        return res.status(502).json({ error: 'Bad gateway - Codex API error' });
      }
    }

    // Get content type - use from database if available, otherwise from response
    const contentType = fileRecord?.content_type || 
                       codexResponse.headers.get('content-type') || 
                       'application/octet-stream';
    const contentLength = codexResponse.headers.get('content-length');
    
    // Set appropriate headers for the response
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Set content disposition with filename if available
    if (fileRecord?.filename) {
      res.setHeader('Content-Disposition', `inline; filename="${fileRecord.filename}"`);
    }
    
    // Add custom headers for debugging
    res.setHeader('X-Codex-CID', cid);
    res.setHeader('X-Gateway-Type', 'public');

    // Log successful request for monitoring
    console.log(`Gateway access: CID=${cid}, IP=${clientIP}, Method=${req.method}, UserAgent=${req.headers['user-agent']?.substring(0, 100) || 'unknown'}`);

    // For HEAD requests, only send headers
    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }

    // Stream the response body for GET requests
    if (codexResponse.body) {
      // Convert the ReadableStream to a Node.js readable stream
      const reader = codexResponse.body.getReader();
      
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        
        if (done) {
          res.end();
          return;
        }
        
        res.write(value);
        return pump();
      };
      
      await pump();
    } else {
      // Fallback: read the entire response and send it
      const buffer = await codexResponse.arrayBuffer();
      res.send(Buffer.from(buffer));
    }

  } catch (error) {
    console.error('Gateway error:', error);
    
    // Check if response was already sent
    if (!res.headersSent) {
      // If it's a browser request, redirect to our nice error page
      if (isBrowserRequest(req)) {
        return res.redirect(302, `/gateway/${cid}`);
      }
      
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};

export default gatewayHandler; 