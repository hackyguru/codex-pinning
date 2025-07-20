// Single source of truth for all plan configurations
export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanFeature {
  name: string;
  included: boolean;
  description?: string;
  limit?: string | number;
}

export interface PlanConfig {
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

// Centralized plan configurations
export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    displayName: 'Free Plan',
    description: 'Perfect for getting started',
    price: {
      monthly: 0,
      formatted: '$0',
    },
    storage: {
      bytes: 10 * 1024 * 1024, // 10 MB
      formatted: '10 MB',
    },
    features: [
      {
        name: 'Storage',
        included: true,
        limit: '10 MB',
        description: '10 MB storage space'
      },
      {
        name: 'API Requests',
        included: true,
        limit: '1K/month',
        description: '1,000 requests per month'
      },
      {
        name: 'Community Support',
        included: true,
        description: 'Community forum support'
      },
      {
        name: 'Priority Support',
        included: false,
        description: 'Email and chat support'
      },
      {
        name: 'Advanced Features',
        included: false,
        description: 'Advanced replication and analytics'
      }
    ],
    ctaText: 'Get Started',
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    displayName: 'Pro Plan',
    description: 'For serious projects',
    price: {
      monthly: 1000, // $10.00 in cents
      formatted: '$10',
    },
    storage: {
      bytes: 50 * 1024 * 1024, // 50 MB
      formatted: '50 MB',
    },
    features: [
      {
        name: 'Storage',
        included: true,
        limit: '50 MB',
        description: '50 MB storage space'
      },
      {
        name: 'API Requests',
        included: true,
        limit: 'Unlimited',
        description: 'Unlimited API requests'
      },
      {
        name: 'Priority Support',
        included: true,
        description: 'Email and chat support with faster response'
      },
      {
        name: 'Advanced Replication',
        included: true,
        description: 'Enhanced file replication strategies'
      },
      {
        name: 'Analytics Dashboard',
        included: true,
        description: 'Detailed usage analytics and insights'
      }
    ],
    popular: true,
    badge: 'Most Popular',
    ctaText: 'Upgrade to Pro',
    stripePriceData: {
      currency: 'usd',
      productName: 'ThirdStorage Pro Plan',
      productDescription: '50MB storage limit with advanced features',
      interval: 'month',
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    displayName: 'Enterprise Plan',
    description: 'For large organizations',
    price: {
      monthly: 0, // Custom pricing
      formatted: 'Custom',
    },
    storage: {
      bytes: Number.MAX_SAFE_INTEGER, // Unlimited
      formatted: 'Unlimited',
    },
    features: [
      {
        name: 'Storage',
        included: true,
        limit: 'Unlimited',
        description: 'Unlimited storage space'
      },
      {
        name: 'API Requests',
        included: true,
        limit: 'Unlimited',
        description: 'Unlimited API requests'
      },
      {
        name: 'Advanced Analytics',
        included: true,
        description: 'Comprehensive analytics and reporting'
      },
      {
        name: 'Custom SLA',
        included: true,
        description: 'Service level agreement tailored to your needs'
      },
      {
        name: 'Dedicated Support',
        included: true,
        description: 'Dedicated customer success manager'
      },
      {
        name: 'On-premise Options',
        included: true,
        description: 'Private cloud and on-premise deployment'
      }
    ],
    ctaText: 'Contact Sales',
  },
};

// Utility functions
export const getPlan = (planType: PlanType): PlanConfig => {
  return PLANS[planType];
};

export const getStorageLimit = (planType: PlanType): number => {
  return PLANS[planType].storage.bytes;
};

export const getStorageLimitFormatted = (planType: PlanType): string => {
  return PLANS[planType].storage.formatted;
};

export const getPlanPrice = (planType: PlanType): number => {
  return PLANS[planType].price.monthly;
};

export const getPlanPriceFormatted = (planType: PlanType): string => {
  return PLANS[planType].price.formatted;
};

export const canUploadFile = (
  currentUsage: number, 
  fileSize: number, 
  planType: PlanType
): boolean => {
  const limit = getStorageLimit(planType);
  return (currentUsage + fileSize) <= limit;
};

export const getStorageUsagePercentage = (
  used: number, 
  planType: PlanType
): number => {
  const limit = getStorageLimit(planType);
  return Math.min((used / limit) * 100, 100);
};

export const isFeatureIncluded = (
  planType: PlanType, 
  featureName: string
): boolean => {
  const plan = getPlan(planType);
  const feature = plan.features.find(f => f.name === featureName);
  return feature?.included || false;
};

export const getAllPlans = (): PlanConfig[] => {
  return Object.values(PLANS);
};

export const getAvailablePlans = (): PlanConfig[] => {
  // Return plans that users can sign up for (exclude enterprise for now)
  return [PLANS.free, PLANS.pro, PLANS.enterprise];
};

// Type guards
export const isValidPlanType = (planType: string): planType is PlanType => {
  return planType in PLANS;
};

export const isPaidPlan = (planType: PlanType): boolean => {
  return planType !== 'free';
};

export const canUpgrade = (currentPlan: PlanType, targetPlan: PlanType): boolean => {
  const planOrder: PlanType[] = ['free', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(targetPlan);
  return targetIndex > currentIndex;
}; 