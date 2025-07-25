import { createClient } from '@supabase/supabase-js';

// These will be set via environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database table names
export const TABLES = {
  USERS: 'users',
  SUBSCRIPTIONS: 'subscriptions',
  TASKS: 'tasks',
  TASK_HISTORY: 'task_history',
  USER_SETTINGS: 'user_settings'
};

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  UNLIMITED: 'unlimited',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise'
};

// Tier limits and features
export const TIER_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    tasksPerDay: 5,
    backgroundMode: false,
    aiProviders: ['openai'],
    maxConcurrentTasks: 1,
    taskHistory: 7, // days
    features: ['basic_automation']
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    tasksPerDay: 50,
    backgroundMode: true,
    aiProviders: ['openai', 'anthropic'],
    maxConcurrentTasks: 3,
    taskHistory: 30, // days
    features: ['basic_automation', 'advanced_automation', 'task_scheduling']
  },
  [SUBSCRIPTION_TIERS.UNLIMITED]: {
    tasksPerDay: -1, // unlimited
    backgroundMode: true,
    aiProviders: ['openai', 'anthropic', 'azure_openai'],
    maxConcurrentTasks: 5,
    taskHistory: 90, // days
    features: ['basic_automation', 'advanced_automation', 'task_scheduling', 'custom_workflows']
  },
  [SUBSCRIPTION_TIERS.BUSINESS]: {
    tasksPerDay: -1, // unlimited
    backgroundMode: true,
    aiProviders: ['openai', 'anthropic', 'azure_openai', 'bedrock'],
    maxConcurrentTasks: 10,
    taskHistory: 365, // days
    features: ['basic_automation', 'advanced_automation', 'task_scheduling', 'custom_workflows', 'team_collaboration']
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    tasksPerDay: -1, // unlimited
    backgroundMode: true,
    aiProviders: ['openai', 'anthropic', 'azure_openai', 'bedrock'],
    maxConcurrentTasks: -1, // unlimited
    taskHistory: -1, // unlimited
    features: ['basic_automation', 'advanced_automation', 'task_scheduling', 'custom_workflows', 'team_collaboration', 'sso', 'audit_logs']
  }
};

export default supabase;

