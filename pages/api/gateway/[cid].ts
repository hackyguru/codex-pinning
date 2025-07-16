import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/auth';
import { FileService } from '../../../lib/fileService';

const gatewayHandler = withAuth(async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cid } = req.query;
  const userId = req.user.id;

  // Validate CID parameter
  if (!cid || typeof cid !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing CID parameter' });
  }

  try {
    // Verify that the user owns a file with this CID
    const fileRecord = await FileService.getFileByCid(cid, userId);
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    // Get Codex API credentials from environment
    const codexApiUrl = process.env.CODEX_API_URL;
    const codexUsername = process.env.CODEX_USERNAME;
    const codexPassword = process.env.CODEX_PASSWORD;

    if (!codexApiUrl || !codexUsername || !codexPassword) {
      console.error('Missing Codex API configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create basic auth header
    const basicAuth = Buffer.from(`${codexUsername}:${codexPassword}`).toString('base64');
    
    // Construct the Codex API URL for streaming content
    const codexUrl = `${codexApiUrl}/data/${cid}/network/stream`;
    
    console.log(`Fetching content from Codex: ${codexUrl} for user: ${userId}`);

    // Make request to Codex API
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
        return res.status(404).json({ error: 'Content specified by the CID is not found' });
      } else if (codexResponse.status === 500) {
        return res.status(500).json({ error: 'Internal server error from Codex' });
      } else if (codexResponse.status === 401) {
        return res.status(500).json({ error: 'Authentication failed' });
      } else {
        return res.status(502).json({ error: 'Bad gateway - Codex API error' });
      }
    }

    // Get content type and set appropriate headers
    const contentType = fileRecord.content_type || 'application/octet-stream';
    const contentLength = codexResponse.headers.get('content-length');
    
    // Set appropriate headers for the response
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Set content disposition with the original filename
    res.setHeader('Content-Disposition', `inline; filename="${fileRecord.filename}"`);
    
    // Add custom headers for debugging
    res.setHeader('X-Codex-CID', cid);
    res.setHeader('X-File-Owner', userId);
    res.setHeader('X-File-ID', fileRecord.id);

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
});

export default gatewayHandler; 