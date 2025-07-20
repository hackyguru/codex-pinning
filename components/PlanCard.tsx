import React from 'react';
import { PlanConfig, type PlanType } from '../lib/plans';

interface PlanCardProps {
  plan: PlanConfig;
  currentPlan?: PlanType;
  onSelect?: (planType: PlanType) => void;
  showButton?: boolean;
  className?: string;
}

const PlanCard: React.FC<PlanCardProps> = ({ 
  plan, 
  currentPlan, 
  onSelect, 
  showButton = true, 
  className = '' 
}) => {
  const isCurrentPlan = currentPlan === plan.id;
  const canUpgrade = currentPlan === 'free' && plan.id === 'pro';

  const handleSelect = () => {
    if (onSelect && !isCurrentPlan) {
      onSelect(plan.id);
    }
  };

  return (
    <div className={`
      bg-zinc-900/50 backdrop-blur-sm border rounded-lg p-8 relative transition-all duration-200
      ${plan.popular 
        ? 'border-zinc-700/80 ring-1 ring-zinc-600/20' 
        : 'border-zinc-800/50'
      }
      ${isCurrentPlan ? 'ring-2 ring-green-500/30' : ''}
      ${className}
    `}>
      {/* Plan Badge */}
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-bold">
            {plan.badge}
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            Current Plan
          </span>
        </div>
      )}

      <div className="text-center">
        {/* Plan Name */}
        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
        
        {/* Price */}
        <div className="text-4xl font-bold text-white mb-4">
          {plan.price.formatted}
          {plan.id !== 'enterprise' && plan.price.monthly > 0 && (
            <span className="text-lg text-zinc-400">/month</span>
          )}
        </div>
        
        {/* Description */}
        <p className={`mb-8 ${plan.popular ? 'text-zinc-300' : 'text-zinc-400'}`}>
          {plan.description}
        </p>
        
        {/* Features List */}
        <ul className="space-y-4 mb-8 text-left">
          {plan.features.map((feature, idx) => (
            <li key={idx} className={`flex items-start ${
              plan.popular ? 'text-zinc-200' : 'text-zinc-300'
            }`}>
              {feature.included ? (
                <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-zinc-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <div>
                <span className={feature.included ? '' : 'line-through text-zinc-500'}>
                  {feature.limit 
                    ? `${feature.limit} ${feature.name.toLowerCase()}` 
                    : feature.description || feature.name
                  }
                </span>
                {feature.description && feature.limit && (
                  <div className="text-sm text-zinc-500 mt-1">
                    {feature.description}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        
        {/* Action Button */}
        {showButton && (
          <button
            onClick={handleSelect}
            disabled={isCurrentPlan}
            className={`
              w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200
              ${isCurrentPlan 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed' 
                : canUpgrade || plan.id === 'enterprise'
                  ? 'bg-white text-black hover:bg-zinc-200 active:scale-95'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }
            `}
          >
            {isCurrentPlan 
              ? 'Current Plan' 
              : plan.ctaText
            }
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanCard; 