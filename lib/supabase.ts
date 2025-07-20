import { createClient } from '@supabase/supabase-js';

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string; // TEXT to support Privy DIDs
          email: string;
          storage_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // Required for Privy DID
          email: string;
          storage_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          storage_used?: number;
          updated_at?: string;
        };
      };
      files: {
        Row: {
          id: string;
          user_id: string; // Now TEXT to match users.id
          filename: string;
          file_size: number;
          cid: string;
          content_type: string;
          upload_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string; // Required Privy DID
          filename: string;
          file_size: number;
          cid: string;
          content_type: string;
          upload_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          file_size?: number;
          cid?: string;
          content_type?: string;
          upload_date?: string;
        };
      };
    };
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Re-export from centralized plan configuration
export { 
  getStorageLimit, 
  canUploadFile,
  type PlanType
} from './plans';

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 