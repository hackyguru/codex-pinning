import { supabaseServer } from './supabase-server';
import crypto from 'crypto';

// Define types manually since the database schema hasn't been updated yet
export interface PinningSecretRecord {
  id: string;
  user_id: string; // TEXT type to match Privy DID format
  name: string;
  secret_prefix: string;
  secret_hash: string;
  scopes: string[];
  rate_limit_per_minute: number;
  monthly_quota_gb: number | null;
  used_quota_gb: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PinningSecretInsert {
  user_id: string;
  name: string;
  secret_prefix: string;
  secret_hash: string;
  scopes?: string[];
  rate_limit_per_minute?: number;
  monthly_quota_gb?: number | null;
  used_quota_gb?: number;
  is_active?: boolean;
  last_used_at?: string | null;
}

export interface PinningSecretUpdate {
  name?: string;
  scopes?: string[];
  rate_limit_per_minute?: number;
  monthly_quota_gb?: number | null;
  used_quota_gb?: number;
  is_active?: boolean;
  last_used_at?: string | null;
  updated_at?: string;
}

export interface CreatePinningSecretParams {
  userId: string;
  name: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  monthlyQuotaGb?: number | null;
}

export interface PinningSecretWithUsage extends PinningSecretRecord {
  usage_this_month: number;
  last_used_display: string;
}

export interface ValidatePinningSecretResult {
  isValid: boolean;
  userId?: string;
  secretId?: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  error?: string;
}

// In-memory rate limiting
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class PinningSecretService {
  /**
   * Generate a new pinning secret
   */
  private static generateSecret(): { fullSecret: string; prefix: string; hash: string } {
    // Generate random secret (64 characters)
    const randomPart = crypto.randomBytes(32).toString('hex');
    
    // Create prefix (ts_ps_XXXXXXXX)
    const prefix = 'ts_ps_' + crypto.randomBytes(4).toString('hex');
    
    // Full secret format: ts_ps_XXXXXXXX_YYYYYYYY...
    const fullSecret = `${prefix}_${randomPart}`;
    
    // Create hash for storage
    const hash = crypto.createHash('sha256').update(fullSecret).digest('hex');
    
    return { fullSecret, prefix, hash };
  }

  /**
   * Create a new pinning secret
   */
  static async createPinningSecret({
    userId,
    name,
    scopes = ['upload', 'download'],
    rateLimitPerMinute = 100,
    monthlyQuotaGb = null
  }: CreatePinningSecretParams): Promise<{ secret: string; record: PinningSecretRecord } | null> {
    try {
      const { fullSecret, prefix, hash } = this.generateSecret();

      const insertData: any = {
        user_id: userId,
        name,
        secret_prefix: prefix,
        secret_hash: hash,
        scopes,
        rate_limit_per_minute: rateLimitPerMinute,
        monthly_quota_gb: monthlyQuotaGb,
        is_active: true
      };

      const { data, error } = await supabaseServer
        .from('pinning_secrets')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating pinning secret:', error);
        return null;
      }

      return {
        secret: fullSecret, // Only returned once during creation
        record: data
      };
    } catch (error) {
      console.error('Error in createPinningSecret:', error);
      return null;
    }
  }

  /**
   * Get all pinning secrets for a user (optimized to use aggregated data)
   */
  static async getUserPinningSecrets(userId: string): Promise<PinningSecretWithUsage[]> {
    try {
      const { data, error } = await supabaseServer
        .from('pinning_secrets')
        .select(`
          *,
          pinning_secret_usage_daily (
            usage_date,
            request_count,
            bytes_transferred
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pinning secrets:', error);
        return [];
      }

      // Calculate usage for each secret using aggregated data
      const secretsWithUsage: PinningSecretWithUsage[] = data.map(secret => {
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const usageThisMonth = secret.pinning_secret_usage_daily
          ?.filter((usage: any) => new Date(usage.usage_date) >= thisMonth)
          .reduce((total: number, usage: any) => total + (usage.bytes_transferred || 0), 0) || 0;

        return {
          ...secret,
          pinning_secret_usage_daily: undefined, // Remove the raw usage data
          usage_this_month: Math.round(usageThisMonth / (1024 * 1024)), // Convert to MB
          last_used_display: secret.last_used_at 
            ? new Date(secret.last_used_at).toLocaleDateString()
            : 'Never'
        };
      });

      return secretsWithUsage;
    } catch (error) {
      console.error('Error in getUserPinningSecrets:', error);
      return [];
    }
  }

  /**
   * Validate a pinning secret
   */
  static async validatePinningSecret(secret: string): Promise<ValidatePinningSecretResult> {
    try {
      if (!secret || !secret.startsWith('ts_ps_')) {
        return { isValid: false, error: 'Invalid pinning secret format' };
      }

      const hash = crypto.createHash('sha256').update(secret).digest('hex');

      const { data, error } = await supabaseServer
        .from('pinning_secrets')
        .select('*')
        .eq('secret_hash', hash)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { isValid: false, error: 'Invalid or revoked pinning secret' };
      }

      // Update last used timestamp (async, don't wait)
      supabaseServer
        .from('pinning_secrets')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id); // Fire and forget

      return {
        isValid: true,
        userId: data.user_id,
        secretId: data.id,
        scopes: data.scopes,
        rateLimitPerMinute: data.rate_limit_per_minute
      };
    } catch (error) {
      console.error('Error validating pinning secret:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  /**
   * Revoke a pinning secret
   */
  static async revokePinningSecret(secretId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseServer
        .from('pinning_secrets')
        .update({ is_active: false })
        .eq('id', secretId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error revoking pinning secret:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in revokePinningSecret:', error);
      return false;
    }
  }

  /**
   * Track pinning secret usage (aggregated daily)
   */
      static async trackUsage(
      secretId: string,
      bytesTransferred: number,
      success: boolean = true
    ): Promise<void> {
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Use the database function for proper aggregation
        await supabaseServer.rpc('upsert_daily_usage', {
          p_secret_id: secretId,
          p_usage_date: today,
          p_request_count: 1,
          p_bytes_transferred: bytesTransferred,
          p_success_count: success ? 1 : 0
        });
      } catch (error) {
        console.error('Error tracking pinning secret usage:', error);
        // Don't throw error as this is for analytics only
      }
    }

  /**
   * Check rate limit for a pinning secret (in-memory)
   */
  static checkRateLimit(secretId: string, rateLimitPerMinute: number): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
  } {
    const now = Date.now();
    const resetTime = now + (60 * 1000); // Reset in 1 minute
    
    const entry = rateLimitMap.get(secretId);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      rateLimitMap.set(secretId, {
        count: 1,
        resetTime
      });
      return {
        allowed: true,
        remainingRequests: rateLimitPerMinute - 1,
        resetTime
      };
    }
    
    // Check if limit exceeded
    if (entry.count >= rateLimitPerMinute) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: entry.resetTime
      };
    }
    
    // Increment count
    entry.count++;
    
    return {
      allowed: true,
      remainingRequests: rateLimitPerMinute - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get usage statistics for a pinning secret (using aggregated data)
   */
  static async getUsageStats(secretId: string, userId: string): Promise<{
    totalRequests: number;
    totalBytes: number;
    successRate: number;
    requestsThisMonth: number;
    bytesThisMonth: number;
  }> {
    try {
      // Verify the secret belongs to the user
      const { data: secret } = await supabaseServer
        .from('pinning_secrets')
        .select('id')
        .eq('id', secretId)
        .eq('user_id', userId)
        .single();

      if (!secret) {
        return {
          totalRequests: 0,
          totalBytes: 0,
          successRate: 0,
          requestsThisMonth: 0,
          bytesThisMonth: 0
        };
      }

      const { data: usage, error } = await supabaseServer
        .from('pinning_secret_usage_daily')
        .select('*')
        .eq('pinning_secret_id', secretId);

      if (error || !usage) {
        return {
          totalRequests: 0,
          totalBytes: 0,
          successRate: 0,
          requestsThisMonth: 0,
          bytesThisMonth: 0
        };
      }

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const totalRequests = usage.reduce((sum, u) => sum + (u.request_count || 0), 0);
      const totalBytes = usage.reduce((sum, u) => sum + (u.bytes_transferred || 0), 0);
      const totalSuccess = usage.reduce((sum, u) => sum + (u.success_count || 0), 0);
      const successRate = totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 0;

      const thisMonthUsage = usage.filter(u => new Date(u.usage_date) >= thisMonth);
      const requestsThisMonth = thisMonthUsage.reduce((sum, u) => sum + (u.request_count || 0), 0);
      const bytesThisMonth = thisMonthUsage.reduce((sum, u) => sum + (u.bytes_transferred || 0), 0);

      return {
        totalRequests,
        totalBytes,
        successRate,
        requestsThisMonth,
        bytesThisMonth
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        totalRequests: 0,
        totalBytes: 0,
        successRate: 0,
        requestsThisMonth: 0,
        bytesThisMonth: 0
      };
    }
  }
} 