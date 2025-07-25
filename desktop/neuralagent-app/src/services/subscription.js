import { supabase, SUBSCRIPTION_TIERS, TIER_LIMITS } from '../utils/supabase';
import authService from './auth';

class SubscriptionService {
  constructor() {
    this.currentSubscription = null;
  }

  // Get current user's subscription
  async getCurrentSubscription() {
    const user = authService.getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('users')
        .select('subscription_tier, subscription_expires_at, tasks_used_today, tasks_reset_date')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      this.currentSubscription = data;
      return { subscription: data };
    } catch (error) {
      console.error('Get subscription error:', error);
      return { error };
    }
  }

  // Upgrade subscription (simplified - no payment processing)
  async upgradeSubscription(newTier, expiresAt = null) {
    const user = authService.getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    // Validate tier
    if (!Object.values(SUBSCRIPTION_TIERS).includes(newTier)) {
      return { error: 'Invalid subscription tier' };
    }

    try {
      const { data, error } = await supabase.rpc('upgrade_subscription', {
        user_uuid: user.id,
        new_tier: newTier,
        expires_at: expiresAt
      });

      if (error) throw error;
      
      // Refresh subscription data
      await this.getCurrentSubscription();
      
      return { success: true, upgraded: data };
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      return { error };
    }
  }

  // Get subscription history
  async getSubscriptionHistory() {
    const user = authService.getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return { history: data };
    } catch (error) {
      console.error('Get subscription history error:', error);
      return { error };
    }
  }

  // Get tier information
  getTierInfo(tier) {
    return TIER_LIMITS[tier] || null;
  }

  // Get all available tiers
  getAllTiers() {
    return Object.keys(SUBSCRIPTION_TIERS).map(key => ({
      id: SUBSCRIPTION_TIERS[key],
      name: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
      ...TIER_LIMITS[SUBSCRIPTION_TIERS[key]]
    }));
  }

  // Check if user can use a feature
  async canUseFeature(featureName) {
    const user = authService.getCurrentUser();
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('has_feature', {
        user_uuid: user.id,
        feature_name: featureName
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Can use feature check error:', error);
      return false;
    }
  }

  // Get usage statistics
  async getUsageStats() {
    const user = authService.getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    try {
      // Get current subscription
      const { subscription, error: subError } = await this.getCurrentSubscription();
      if (subError) throw new Error(subError);

      // Get task counts
      const { data: taskCounts, error: taskError } = await supabase
        .from('tasks')
        .select('status')
        .eq('user_id', user.id);

      if (taskError) throw taskError;

      // Get tier limits
      const tierLimits = this.getTierInfo(subscription.subscription_tier);

      const stats = {
        subscription: subscription,
        tierLimits: tierLimits,
        usage: {
          tasksToday: subscription.tasks_used_today,
          totalTasks: taskCounts.length,
          completedTasks: taskCounts.filter(t => t.status === 'completed').length,
          failedTasks: taskCounts.filter(t => t.status === 'failed').length,
          runningTasks: taskCounts.filter(t => t.status === 'running').length
        }
      };

      return { stats };
    } catch (error) {
      console.error('Get usage stats error:', error);
      return { error };
    }
  }

  // Check if subscription is expired
  isSubscriptionExpired(subscription) {
    if (!subscription?.subscription_expires_at) return false;
    return new Date(subscription.subscription_expires_at) < new Date();
  }

  // Get days until expiration
  getDaysUntilExpiration(subscription) {
    if (!subscription?.subscription_expires_at) return null;
    
    const expirationDate = new Date(subscription.subscription_expires_at);
    const now = new Date();
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Get tier comparison data for billing page
  getTierComparison() {
    return [
      {
        tier: SUBSCRIPTION_TIERS.FREE,
        name: 'Free',
        price: '$0',
        period: 'forever',
        features: [
          '5 tasks per day',
          'Basic automation',
          'OpenAI integration',
          '1 concurrent task',
          '7 days history'
        ],
        limitations: [
          'No background mode',
          'Limited AI providers',
          'Basic features only'
        ],
        popular: false
      },
      {
        tier: SUBSCRIPTION_TIERS.PRO,
        name: 'Pro',
        price: '$19',
        period: 'per month',
        features: [
          '50 tasks per day',
          'Background mode',
          'Advanced automation',
          'Task scheduling',
          'OpenAI + Anthropic',
          '3 concurrent tasks',
          '30 days history'
        ],
        limitations: [],
        popular: true
      },
      {
        tier: SUBSCRIPTION_TIERS.UNLIMITED,
        name: 'Unlimited',
        price: '$49',
        period: 'per month',
        features: [
          'Unlimited tasks',
          'All Pro features',
          'Custom workflows',
          'Azure OpenAI support',
          '5 concurrent tasks',
          '90 days history'
        ],
        limitations: [],
        popular: false
      },
      {
        tier: SUBSCRIPTION_TIERS.BUSINESS,
        name: 'Business',
        price: '$99',
        period: 'per month',
        features: [
          'Everything in Unlimited',
          'Team collaboration',
          'All AI providers',
          '10 concurrent tasks',
          '1 year history',
          'Priority support'
        ],
        limitations: [],
        popular: false
      },
      {
        tier: SUBSCRIPTION_TIERS.ENTERPRISE,
        name: 'Enterprise',
        price: 'Custom',
        period: 'contact us',
        features: [
          'Everything in Business',
          'SSO integration',
          'Audit logs',
          'Unlimited concurrent tasks',
          'Unlimited history',
          'Dedicated support',
          'Custom integrations'
        ],
        limitations: [],
        popular: false
      }
    ];
  }
}

// Create singleton instance
const subscriptionService = new SubscriptionService();
export default subscriptionService;

