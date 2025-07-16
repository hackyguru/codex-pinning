import { createClient } from '@supabase/supabase-js';

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string; // Now TEXT to support Privy DIDs
          email: string;
          plan_type: 'free' | 'pro';
          storage_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // Required for Privy DID
          email: string;
          plan_type?: 'free' | 'pro';
          storage_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          plan_type?: 'free' | 'pro';
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

// Plan limits
export const PLAN_LIMITS = {
  free: 10 * 1024 * 1024, // 10MB in bytes
  pro: 50 * 1024 * 1024,  // 50MB in bytes
} as const;

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get user's storage limit
export const getStorageLimit = (planType: 'free' | 'pro'): number => {
  return PLAN_LIMITS[planType];
};

// Helper function to check if user can upload file
export const canUploadFile = (currentUsage: number, fileSize: number, planType: 'free' | 'pro'): boolean => {
  const limit = getStorageLimit(planType);
  return (currentUsage + fileSize) <= limit;
}; 