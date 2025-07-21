import { withAuth } from '../../../lib/auth';
import { FileService } from '../../../lib/fileService';

const deleteFileHandler = withAuth(async (req, res) => {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from JWT verification
    const userId = req.user.id;

    // Get file ID from query parameters
    const { fileId } = req.query;

    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Delete file from database
    const success = await FileService.deleteFile(fileId, userId);

    if (!success) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default deleteFileHandler; 