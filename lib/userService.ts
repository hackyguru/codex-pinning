import { supabaseServer } from './supabase-server';
import { Database, formatFileSize } from './supabase';
import { getStorageLimit, canUploadFile, type PlanType } from './plans';

export type UserRecord = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface UserStats {
  storageUsed: number;
  storageLimit: number;
  planType: PlanType;
  email: string;
  filesCount: number;
  usagePercentage: number;
}

export class UserService {
  /**
   * Get user's current plan from subscriptions table (SINGLE source of truth)
   */
  static async getUserPlan(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
    try {
      // Check for active subscription (ONLY source of truth)
      const { data: subscription, error: subError } = await supabaseServer
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!subError && subscription) {
        return subscription.plan_type as 'free' | 'pro' | 'enterprise';
      }

      // If no active subscription found, default to free
      // This ensures new users get free plan until they upgrade
      return 'free';
    } catch (error) {
      console.error('Error getting user plan:', error);
      return 'free';
    }
  }

  /**
   * Create or update user profile when they authenticate
   */
  static async upsertUserProfile(
    userId: string,
    email: string,
    planType: 'free' | 'pro' | 'enterprise' = 'free'
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
        // Create new user (no plan_type since we removed that column)
        const { data, error } = await supabaseServer
          .from('users')
          .insert({
            id: userId,
            email: email,
            storage_used: 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user profile:', error);
          return null;
        }

        // CRITICAL: Create subscription record for new user
        console.log(`Creating subscription record for new user ${userId} with plan: ${planType}`);
        const { error: subscriptionError } = await supabaseServer
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: planType,
            status: 'active',
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (subscriptionError) {
          console.error('Error creating subscription record for new user:', subscriptionError);
          // Don't fail completely - user profile was created
          console.warn(`User ${userId} created without subscription record - will default to free plan`);
        } else {
          console.log(`✅ New user ${userId} created with ${planType} subscription`);
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

      // Get plan type from subscriptions table (single source of truth)
      const planType = await this.getUserPlan(userId);
      const limit = getStorageLimit(planType);
      const canUpload = canUploadFile(userProfile.storage_used, fileSize, planType);

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
      // Get user data (no longer fetch plan_type from here)
      const { data: userData, error: userError } = await supabaseServer
        .from('users')
        .select('storage_used, email')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user stats:', userError);
        return null;
      }

      if (!userData) {
        return null;
      }

      // Get plan type from subscriptions (source of truth)
      const planType = await UserService.getUserPlan(userId);

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
      const storageLimit = getStorageLimit(planType);
      const usagePercentage = (userData.storage_used / storageLimit) * 100;

      return {
        storageUsed: userData.storage_used,
        storageLimit,
        planType: planType,
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