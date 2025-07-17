import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../../lib/supabase-server';

const gatewayHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cid } = req.query;

  // Validate CID parameter
  if (!cid || typeof cid !== 'string') {
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

    // Use demo-node-1 Codex API credentials (same as storage service)
    const codexApiUrl = 'https://api.demo.codex.storage/fileshareapp/api/codex/v1';
    const codexUsername = 'codex';
    const codexPassword = 'iOpcciMDt2xCJnPrlJ86AaBOrbTzFH';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
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

    // Stream the response body
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
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};

export default gatewayHandler; 