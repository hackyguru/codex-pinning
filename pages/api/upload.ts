import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { withAuth } from '../../lib/auth';
import { UserService } from '../../lib/userService';
import { FileService } from '../../lib/fileService';

// File validation constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  // Video
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  // Code
  'application/json', 'text/html', 'text/css', 'text/javascript'
];

const DANGEROUS_FILE_EXTENSIONS = [
  '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.bin', '.run'
];

// Rate limiting (in-memory store)
const uploadAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_UPLOADS_PER_MINUTE = 5;

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

function validateFile(fileName: string, mimeType: string, fileSize: number): FileValidationResult {
  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  // Check file extension
  const fileExtension = path.extname(fileName).toLowerCase();
  if (DANGEROUS_FILE_EXTENSIONS.includes(fileExtension)) {
    return { valid: false, error: `File type '${fileExtension}' is not allowed for security reasons` };
  }

  // Check MIME type
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
    return { valid: false, error: `File type '${mimeType}' is not supported` };
  }

  // Additional filename validation
  if (fileName.length > 255) {
    return { valid: false, error: 'Filename too long' };
  }

  if (!/^[\w\-. ]+$/.test(fileName)) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }

  return { valid: true };
}

function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(userId);

  if (!userAttempts || now > userAttempts.resetTime) {
    // Reset or create new rate limit window
    uploadAttempts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (userAttempts.count >= MAX_UPLOADS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }

  // Increment count
  userAttempts.count++;
  uploadAttempts.set(userId, userAttempts);
  return { allowed: true };
}

function cleanupTempFile(filepath: string) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Error cleaning up temp file:', error);
  }
}

const uploadHandler = withAuth(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;
  const userEmail = req.user.email;

  // Check rate limit
  const rateLimitResult = checkRateLimit(userId);
  if (!rateLimitResult.allowed) {
    const resetInSeconds = Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000);
    return res.status(429).json({
      error: 'Too many upload attempts',
      message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
      retryAfter: resetInSeconds
    });
  }

  // Get Codex API credentials from environment variables
  const codexApiUrl = process.env.CODEX_API_URL || 'https://api.demo.codex.storage/fileshareapp/api/codex/v1';
  const codexUsername = process.env.CODEX_USERNAME || 'codex';
  const codexPassword = process.env.CODEX_PASSWORD;

  if (!codexPassword) {
    return res.status(500).json({ error: 'Storage service configuration missing' });
  }

  let uploadedFile: File | undefined = undefined;

  try {
    console.log('Processing upload request for user:', userId);

    // Parse the multipart form data with enhanced security
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      maxFields: 10,
      maxFieldsSize: 1024, // 1KB for form fields
      allowEmptyFiles: false,
      filter: ({ name, originalFilename, mimetype }) => {
        // Additional filtering during parsing
        if (name !== 'file') return false;
        if (!originalFilename || !mimetype) return false;
        
        // Only check filename and mimetype during filter, not file size
        // File size will be checked after the file is fully parsed
        const fileExtension = path.extname(originalFilename).toLowerCase();
        if (DANGEROUS_FILE_EXTENSIONS.includes(fileExtension)) {
          return false;
        }
        
        if (!ALLOWED_FILE_TYPES.includes(mimetype)) {
          return false;
        }
        
        return true;
      }
    });

    const [, files] = await form.parse(req);

    // Get the uploaded file
    uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded or file was rejected' });
    }

    // Read file content
    const fileContent = fs.readFileSync(uploadedFile.filepath);
    const fileName = uploadedFile.originalFilename || 'unnamed-file';
    const mimeType = uploadedFile.mimetype || 'application/octet-stream';
    const fileSize = fileContent.length;

    // Validate file
    const validation = validateFile(fileName, mimeType, fileSize);
    if (!validation.valid) {
      cleanupTempFile(uploadedFile.filepath);
      return res.status(400).json({ error: validation.error });
    }

    console.log(`Processing file: ${fileName} (${mimeType}, ${fileSize} bytes) for user: ${userId}`);

    // Ensure user profile exists
    const userProfile = await UserService.upsertUserProfile(userId, userEmail);
    if (!userProfile) {
      cleanupTempFile(uploadedFile.filepath);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Check storage limits
    const canUpload = await UserService.canUserUploadFile(userId, fileSize);
    if (!canUpload.canUpload) {
      cleanupTempFile(uploadedFile.filepath);
      return res.status(413).json({ 
        error: 'Storage limit exceeded', 
        message: canUpload.reason,
        currentUsage: canUpload.currentUsage,
        limit: canUpload.limit
      });
    }

    // Create basic auth header
    const basicAuth = Buffer.from(`${codexUsername}:${codexPassword}`).toString('base64');
    
    // Upload to Codex
    const codexUrl = `${codexApiUrl}/data`;
    
    console.log(`Uploading to Codex: ${codexUrl}`);
    
    const codexResponse = await fetch(codexUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'User-Agent': 'ThirdStorage-Upload/1.0',
      },
      body: fileContent,
    });

    // Clean up temporary file immediately after upload
    cleanupTempFile(uploadedFile.filepath);
    uploadedFile = undefined; // Mark as cleaned up

    // Handle Codex API responses
    if (!codexResponse.ok) {
      console.error(`Codex upload error: ${codexResponse.status} ${codexResponse.statusText}`);
      
      if (codexResponse.status === 422) {
        return res.status(422).json({ error: 'The file type is invalid or not supported by the storage service' });
      } else if (codexResponse.status === 500) {
        return res.status(500).json({ error: 'Storage service error - please try again later' });
      } else if (codexResponse.status === 401) {
        return res.status(500).json({ error: 'Storage service authentication failed' });
      } else if (codexResponse.status === 413) {
        return res.status(413).json({ error: 'File too large for storage service' });
      } else {
        return res.status(502).json({ error: 'Storage service unavailable - please try again later' });
      }
    }

    // Get the CID from the response
    const cid = await codexResponse.text();
    
    if (!cid || cid.trim() === '') {
      return res.status(500).json({ error: 'Invalid response from storage service' });
    }

    console.log(`File uploaded successfully with CID: ${cid}`);

    // Save file metadata to database
    const savedFile = await FileService.saveFile({
      user_id: userId,
      filename: fileName,
      file_size: fileSize,
      cid: cid.trim(),
      content_type: mimeType,
      upload_date: new Date().toISOString(),
      upload_method: req.user.authMethod === 'pinning_secret' ? 'api' : 'dashboard',
      pinning_secret_id: req.user.pinningSecretId || undefined,
    });

    if (!savedFile) {
      console.error('Failed to save file metadata to database');
      // TODO: In production, implement cleanup of uploaded file from Codex
      return res.status(500).json({ 
        error: 'File uploaded but failed to save metadata', 
        message: 'Please contact support if this persists' 
      });
    }

    // Return success response with file info
    return res.status(200).json({
      success: true,
      file: {
        id: savedFile.id,
        cid: cid.trim(),
        filename: fileName,
        contentType: mimeType,
        size: fileSize,
        uploadedAt: new Date().toISOString(),
        uploadMethod: req.user.authMethod === 'pinning_secret' ? 'api' : 'dashboard'
      },
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up temporary file if it exists
    if (uploadedFile && uploadedFile.filepath) {
      cleanupTempFile(uploadedFile.filepath);
    }
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Storage limit exceeded')) {
        return res.status(413).json({ 
          error: 'Storage limit exceeded', 
          message: error.message 
        });
      }
      
      if (error.message.includes('maxFileSize')) {
        return res.status(413).json({ 
          error: 'File too large', 
          message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        });
      }
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: 'File upload failed - please try again' 
    });
  }
});

export { uploadHandler as default };

// Disable Next.js body parsing to handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
}; 