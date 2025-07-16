import { supabaseServer } from './supabase-server';
import { Database, formatFileSize } from './supabase';

export type FileRecord = Database['public']['Tables']['files']['Row'] & {
  upload_method?: string;
  pinning_secret_id?: string;
};

export type FileInsert = Database['public']['Tables']['files']['Insert'] & {
  upload_method?: string;
  pinning_secret_id?: string;
};

export interface FileWithFormatted extends FileRecord {
  formattedSize: string;
  formattedDate: string;
}

export class FileService {
  /**
   * Save uploaded file to database
   */
  static async saveFile(fileData: FileInsert): Promise<FileRecord | null> {
    try {
      const { data, error } = await supabaseServer
        .from('files')
        .insert(fileData)
        .select()
        .single();

      if (error) {
        console.error('Error saving file:', error);
        console.error('Error details:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in saveFile:', error);
      return null;
    }
  }

  /**
   * Get all files for a user
   */
  static async getUserFiles(userId: string): Promise<FileWithFormatted[]> {
    try {
      const { data, error } = await supabaseServer
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Error fetching user files:', error);
        return [];
      }

      return (data || []).map(file => ({
        ...file,
        formattedSize: formatFileSize(file.file_size),
        formattedDate: new Date(file.upload_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      }));
    } catch (error) {
      console.error('Error in getUserFiles:', error);
      return [];
    }
  }

  /**
   * Delete a file by ID
   */
  static async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseServer
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId); // Ensure user can only delete their own files

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return false;
    }
  }

  /**
   * Get file by ID
   */
  static async getFile(fileId: string, userId: string): Promise<FileRecord | null> {
    try {
      const { data, error } = await supabaseServer
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching file:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getFile:', error);
      return null;
    }
  }

  /**
   * Get file by CID
   */
  static async getFileByCid(cid: string, userId: string): Promise<FileRecord | null> {
    try {
      const { data, error } = await supabaseServer
        .from('files')
        .select('*')
        .eq('cid', cid)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching file by CID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getFileByCid:', error);
      return null;
    }
  }

  /**
   * Get user's total storage usage
   */
  static async getUserStorageUsage(userId: string): Promise<number> {
    try {
      const { data, error } = await supabaseServer
        .from('files')
        .select('file_size')
        .eq('user_id', userId);

      if (error) {
        console.error('Error calculating storage usage:', error);
        return 0;
      }

      return (data || []).reduce((total, file) => total + file.file_size, 0);
    } catch (error) {
      console.error('Error in getUserStorageUsage:', error);
      return 0;
    }
  }

  /**
   * Format content type for display
   */
  static formatContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WEBP',
      'text/plain': 'TXT',
      'application/json': 'JSON',
      'application/zip': 'ZIP',
      'application/x-zip-compressed': 'ZIP',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'video/mp4': 'MP4',
      'video/webm': 'WEBM',
      'audio/mpeg': 'MP3',
      'audio/wav': 'WAV'
    };

    return typeMap[contentType] || contentType.split('/')[1]?.toUpperCase() || 'UNKNOWN';
  }

  /**
   * Get file icon based on content type
   */
  static getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType === 'application/pdf') return '📄';
    if (contentType.includes('document') || contentType.includes('word')) return '📝';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊';
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return '📽️';
    if (contentType.includes('zip') || contentType.includes('compressed')) return '📦';
    if (contentType.includes('json') || contentType.includes('javascript')) return '📋';
    return '📄';
  }
} 