import { supabaseServer } from './supabase-server';
import { Database, getStorageLimit, canUploadFile, formatFileSize } from './supabase';

export type UserRecord = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface UserStats {
  storageUsed: number;
  storageLimit: number;
  planType: 'free' | 'pro';
  email: string;
  filesCount: number;
  usagePercentage: number;
}

export class UserService {
  /**
   * Create or update user profile when they authenticate
   */
  static async upsertUserProfile(
    userId: string,
    email: string,
    planType: 'free' | 'pro' = 'free'
  ): Promise<UserRecord | null> {
    try {
      // First, try to get existing user
      const { data: existingUser, error: fetchError } = await supabaseServer
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingUser) {
        // Update existing user
        const { data, error } = await supabaseServer
          .from('users')
          .update({
            email: email,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating user profile:', error);
          return null;
        }

        return data;
      } else {
        // Create new user
        const { data, error } = await supabaseServer
          .from('users')
          .insert({
            id: userId,
            email: email,
            plan_type: planType,
            storage_used: 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user profile:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error in upsertUserProfile:', error);
      return null;
    }
  }

  /**
   * Check if user can upload a file
   */
  static async canUserUploadFile(userId: string, fileSize: number): Promise<{
    canUpload: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number;
  }> {
    try {
      const userProfile = await this.getUser(userId);
      if (!userProfile) {
        return { canUpload: false, reason: 'User profile not found' };
      }

      const limit = getStorageLimit(userProfile.plan_type);
      const canUpload = canUploadFile(userProfile.storage_used, fileSize, userProfile.plan_type);

      if (!canUpload) {
        const remainingSpace = limit - userProfile.storage_used;
        return {
          canUpload: false,
          reason: `Insufficient storage space. You need ${formatFileSize(fileSize)} but only have ${formatFileSize(remainingSpace)} remaining.`,
          currentUsage: userProfile.storage_used,
          limit
        };
      }

      return {
        canUpload: true,
        currentUsage: userProfile.storage_used,
        limit
      };
    } catch (error) {
      console.error('Error in canUserUploadFile:', error);
      return { canUpload: false, reason: 'Error checking storage limits' };
    }
  }

  /**
   * Create a new user
   */
  static async createUser(userData: UserInsert): Promise<UserRecord | null> {
    try {
      const { data, error } = await supabaseServer
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createUser:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<UserRecord | null> {
    try {
      const { data, error } = await supabaseServer
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUser:', error);
      return null;
    }
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, updates: UserUpdate): Promise<UserRecord | null> {
    try {
      const { data, error } = await supabaseServer
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateUser:', error);
      return null;
    }
  }

  /**
   * Get user stats (storage usage, plan type, email, files count, usage percentage)
   */
  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabaseServer
        .from('users')
        .select('storage_used, plan_type, email')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user stats:', userError);
        return null;
      }

      if (!userData) {
        return null;
      }

      // Get files count
      const { count: filesCount, error: filesError } = await supabaseServer
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (filesError) {
        console.error('Error fetching files count:', filesError);
        return null;
      }

      // Calculate storage limit and usage percentage
      const storageLimit = getStorageLimit(userData.plan_type);
      const usagePercentage = (userData.storage_used / storageLimit) * 100;

      return {
        storageUsed: userData.storage_used,
        storageLimit,
        planType: userData.plan_type,
        email: userData.email,
        filesCount: filesCount || 0,
        usagePercentage: Math.min(usagePercentage, 100)
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return null;
    }
  }

  /**
   * Update user's storage usage
   */
  static async updateStorageUsage(userId: string, storageUsed: number): Promise<boolean> {
    try {
      const { error } = await supabaseServer
        .from('users')
        .update({ storage_used: storageUsed })
        .eq('id', userId);

      if (error) {
        console.error('Error updating storage usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateStorageUsage:', error);
      return false;
    }
  }

  /**
   * Check if user exists
   */
  static async userExists(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseServer
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user existence:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in userExists:', error);
      return false;
    }
  }

  /**
   * Upgrade user to pro plan
   */
  static async upgradeUserToPro(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseServer
        .from('users')
        .update({
          plan_type: 'pro',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error upgrading user to pro:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in upgradeUserToPro:', error);
      return false;
    }
  }

  /**
   * Get storage usage message for display
   */
  static getStorageMessage(stats: UserStats): string {
    const { storageUsed, storageLimit, planType } = stats;
    const usedFormatted = formatFileSize(storageUsed);
    const limitFormatted = formatFileSize(storageLimit);

    if (stats.usagePercentage >= 90) {
      return `⚠️ Storage almost full: ${usedFormatted} / ${limitFormatted} (${planType.toUpperCase()})`;
    } else if (stats.usagePercentage >= 75) {
      return `📊 Storage usage: ${usedFormatted} / ${limitFormatted} (${planType.toUpperCase()})`;
    } else {
      return `📊 ${usedFormatted} / ${limitFormatted} used (${planType.toUpperCase()})`;
    }
  }
} 