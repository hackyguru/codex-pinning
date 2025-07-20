# Plan Configuration System

## Overview

ThirdStorage now uses a **centralized plan configuration system** to ensure consistency across all components. All plan-related data is defined in a single source of truth: `lib/plans.ts`.

## 🎯 Benefits

- **Single Source of Truth**: All plan data is centralized
- **Type Safety**: Full TypeScript support with proper types
- **Maintainability**: Easy to update plans without hunting across multiple files
- **Consistency**: No more hardcoded values scattered throughout the codebase
- **Flexibility**: Easy to add new plans or modify existing ones

## 📁 File Structure

```
lib/
├── plans.ts           # ✨ Central plan configuration
├── supabase.ts        # Re-exports plan utilities
└── userService.ts     # Uses centralized plan types

components/
└── PlanCard.tsx       # Reusable plan display component

pages/
├── index.tsx          # Uses centralized pricing
├── dashboard.tsx      # Uses centralized plan data
└── api/stripe/        # Uses centralized plan pricing
```

## 🔧 Core Configuration

### Plan Types
```typescript
export type PlanType = 'free' | 'pro' | 'enterprise';
```

### Plan Structure
```typescript
interface PlanConfig {
  id: PlanType;
  name: string;
  displayName: string;
  description: string;
  price: {
    monthly: number; // in cents
    formatted: string;
  };
  storage: {
    bytes: number;
    formatted: string;
  };
  features: PlanFeature[];
  popular?: boolean;
  badge?: string;
  ctaText: string;
  stripePriceData?: {
    currency: string;
    productName: string;
    productDescription: string;
    interval: 'month' | 'year';
  };
}
```

## 🛠️ Available Utilities

### Import
```typescript
import { 
  getPlan, 
  getStorageLimit, 
  getStorageLimitFormatted,
  getPlanPrice,
  getPlanPriceFormatted,
  canUploadFile,
  isFeatureIncluded,
  getAllPlans,
  getAvailablePlans,
  type PlanType 
} from '../lib/plans';
```

### Common Functions
```typescript
// Get complete plan configuration
const proPlan = getPlan('pro');

// Get storage limit in bytes
const storageBytes = getStorageLimit('pro'); // 52428800

// Get formatted storage limit
const storageFormatted = getStorageLimitFormatted('pro'); // "50 MB"

// Check upload capability
const canUpload = canUploadFile(currentUsage, fileSize, 'pro');

// Check feature availability
const hasFeature = isFeatureIncluded('pro', 'Priority Support');

// Get all available plans
const plans = getAvailablePlans(); // [free, pro, enterprise]
```

## 📋 Current Plan Configuration

### Free Plan
- **Storage**: 10 MB
- **Price**: $0/month
- **Features**: Basic storage, community support

### Pro Plan
- **Storage**: 50 MB  
- **Price**: $10/month
- **Features**: Enhanced storage, priority support, advanced features
- **Badge**: "Most Popular"

### Enterprise Plan
- **Storage**: Unlimited
- **Price**: Custom pricing
- **Features**: All features + custom SLA, dedicated support

## 🔄 Migration Guide

### Before (Scattered Configuration)
```typescript
// ❌ Old way - hardcoded in multiple files
const storageLimit = planType === 'free' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
const planName = planType === 'pro' ? 'Pro Plan' : 'Free Plan';
const price = planType === 'pro' ? '$10' : '$0';
```

### After (Centralized Configuration)
```typescript
// ✅ New way - centralized
const plan = getPlan(planType);
const storageLimit = plan.storage.bytes;
const planName = plan.displayName;
const price = plan.price.formatted;
```

## 🎨 UI Components

### Using PlanCard Component
```typescript
import PlanCard from '../components/PlanCard';
import { getAvailablePlans } from '../lib/plans';

// Display all plans
{getAvailablePlans().map(plan => (
  <PlanCard 
    key={plan.id}
    plan={plan}
    currentPlan={userPlan}
    onSelect={handlePlanSelect}
  />
))}
```

### Custom Plan Display
```typescript
// Dynamic pricing section
{getAvailablePlans().map(plan => (
  <div key={plan.id}>
    <h3>{plan.name}</h3>
    <div>{plan.price.formatted}/month</div>
    <p>{plan.description}</p>
    <ul>
      {plan.features.filter(f => f.included).map(feature => (
        <li key={feature.name}>
          {feature.limit ? `${feature.limit} ${feature.name}` : feature.description}
        </li>
      ))}
    </ul>
  </div>
))}
```

## 🔧 Adding New Plans

1. **Update Plan Configuration**
```typescript
// lib/plans.ts
export const PLANS: Record<PlanType, PlanConfig> = {
  // ... existing plans
  premium: {
    id: 'premium',
    name: 'Premium',
    displayName: 'Premium Plan',
    description: 'For power users',
    price: {
      monthly: 2500, // $25.00
      formatted: '$25',
    },
    storage: {
      bytes: 100 * 1024 * 1024, // 100 MB
      formatted: '100 MB',
    },
    features: [
      // ... features
    ],
    ctaText: 'Upgrade to Premium',
  }
};
```

2. **Update Type Definition**
```typescript
export type PlanType = 'free' | 'pro' | 'premium' | 'enterprise';
```

3. **Components automatically update!** 🎉

## 🚀 Stripe Integration

Stripe checkout sessions now use centralized plan data:

```typescript
// pages/api/stripe/create-checkout-session.ts
const plan = getPlan('pro');

const sessionConfig = {
  line_items: [{
    price_data: {
      currency: plan.stripePriceData!.currency,
      product_data: {
        name: plan.stripePriceData!.productName,
        description: plan.stripePriceData!.productDescription,
      },
      unit_amount: plan.price.monthly,
      recurring: {
        interval: plan.stripePriceData!.interval,
      },
    },
    quantity: 1,
  }],
  // ...
};
```

## ✅ Files Updated

The following files now use the centralized plan system:

- ✅ `lib/plans.ts` - Central configuration
- ✅ `lib/supabase.ts` - Re-exports utilities  
- ✅ `lib/userService.ts` - Uses central types
- ✅ `pages/api/stripe/create-checkout-session.ts` - Dynamic pricing
- ✅ `pages/index.tsx` - Dynamic pricing display
- ✅ `pages/dashboard.tsx` - Plan display and limits
- ✅ `components/PlanCard.tsx` - Reusable component

## 🎯 Next Steps

1. **Update remaining hardcoded references** in other files
2. **Add plan comparison features** using centralized data
3. **Implement plan upgrade/downgrade flows** with central validation
4. **Add plan analytics** using centralized configuration

## 📝 Maintenance

When updating plans:
1. ✅ **DO**: Update `lib/plans.ts` only
2. ❌ **DON'T**: Hardcode values in components
3. ✅ **DO**: Use utility functions for all plan logic
4. ❌ **DON'T**: Duplicate plan data across files

This system ensures your plan configuration stays consistent and maintainable! 🚀 