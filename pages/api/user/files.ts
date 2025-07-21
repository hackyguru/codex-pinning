import { withAuth } from '../../../lib/auth';
import { FileService } from '../../../lib/fileService';

const userFilesHandler = withAuth(async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from JWT verification
    const userId = req.user.id;

    // Get user files from database
    const files = await FileService.getUserFiles(userId);

    return res.status(200).json({
      success: true,
      files,
      count: files.length
    });

  } catch (error) {
    console.error('Error fetching user files:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default userFilesHandler; 