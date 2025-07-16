# ThirdStorage Database Setup

## Quick Setup

**One file to rule them all!** 🎉

Simply run this single SQL file in your Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
supabase-complete-schema.sql
```

## What's Included

This comprehensive schema file includes:

### 📊 **Core Tables**
- `users` - User accounts with Privy DID support
- `files` - File metadata and storage tracking
- `pinning_secrets` - API authentication secrets
- `pinning_secret_usage_daily` - Optimized usage tracking

### 🔐 **Security Features**
- Row Level Security (RLS) policies
- Proper user data isolation
- Service role access for API operations

### ⚡ **Performance Optimizations**
- Efficient indexing on all tables
- Daily usage aggregation (99% cost reduction)
- In-memory rate limiting support

### 🔧 **Functions & Triggers**
- Automatic storage quota tracking
- User profile upsert functionality
- Daily usage aggregation function
- Timestamp management

## Cost Optimization

**Before:** 1 database record per API request
**After:** 1 database record per secret per day

**Result:** ~99% reduction in database costs! 💰

## Migration from Old Schema

If you had the old multi-file setup, this single file will:
- Drop all existing tables safely
- Recreate everything with optimizations
- Preserve all functionality while reducing costs

## Ready to Use!

After running the schema:
1. Your database is fully set up
2. All optimizations are enabled
3. Ready for production use

No more juggling multiple SQL files! 🎯 