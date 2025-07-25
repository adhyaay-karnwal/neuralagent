-- Function to upgrade user subscription
CREATE OR REPLACE FUNCTION public.upgrade_subscription(
    user_uuid UUID,
    new_tier subscription_tier,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_tier subscription_tier;
BEGIN
    -- Get current tier
    SELECT subscription_tier INTO current_tier 
    FROM public.users 
    WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update user subscription
    UPDATE public.users 
    SET 
        subscription_tier = new_tier,
        subscription_expires_at = expires_at,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Log subscription change
    INSERT INTO public.subscription_history (user_id, from_tier, to_tier, expires_at)
    VALUES (user_uuid, current_tier, new_tier, expires_at);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription features
CREATE OR REPLACE FUNCTION public.has_feature(user_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier subscription_tier;
BEGIN
    SELECT subscription_tier INTO user_tier 
    FROM public.users 
    WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if subscription is expired
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_uuid 
        AND subscription_expires_at IS NOT NULL 
        AND subscription_expires_at < NOW()
    ) THEN
        -- Downgrade to free if expired
        UPDATE public.users 
        SET subscription_tier = 'free', subscription_expires_at = NULL
        WHERE id = user_uuid;
        user_tier := 'free';
    END IF;
    
    -- Feature matrix
    RETURN CASE 
        WHEN feature_name = 'basic_automation' THEN TRUE -- All tiers
        WHEN feature_name = 'background_mode' THEN user_tier != 'free'
        WHEN feature_name = 'advanced_automation' THEN user_tier IN ('pro', 'unlimited', 'business', 'enterprise')
        WHEN feature_name = 'task_scheduling' THEN user_tier IN ('pro', 'unlimited', 'business', 'enterprise')
        WHEN feature_name = 'custom_workflows' THEN user_tier IN ('unlimited', 'business', 'enterprise')
        WHEN feature_name = 'team_collaboration' THEN user_tier IN ('business', 'enterprise')
        WHEN feature_name = 'sso' THEN user_tier = 'enterprise'
        WHEN feature_name = 'audit_logs' THEN user_tier = 'enterprise'
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user tier limits
CREATE OR REPLACE FUNCTION public.get_tier_limits(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    user_tier subscription_tier;
    result JSON;
BEGIN
    SELECT subscription_tier INTO user_tier 
    FROM public.users 
    WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN '{"error": "User not found"}'::JSON;
    END IF;
    
    -- Check if subscription is expired
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_uuid 
        AND subscription_expires_at IS NOT NULL 
        AND subscription_expires_at < NOW()
    ) THEN
        -- Downgrade to free if expired
        UPDATE public.users 
        SET subscription_tier = 'free', subscription_expires_at = NULL
        WHERE id = user_uuid;
        user_tier := 'free';
    END IF;
    
    -- Return tier limits as JSON
    result := CASE user_tier
        WHEN 'free' THEN '{
            "tasksPerDay": 5,
            "backgroundMode": false,
            "aiProviders": ["openai"],
            "maxConcurrentTasks": 1,
            "taskHistory": 7,
            "features": ["basic_automation"]
        }'::JSON
        WHEN 'pro' THEN '{
            "tasksPerDay": 50,
            "backgroundMode": true,
            "aiProviders": ["openai", "anthropic"],
            "maxConcurrentTasks": 3,
            "taskHistory": 30,
            "features": ["basic_automation", "advanced_automation", "task_scheduling"]
        }'::JSON
        WHEN 'unlimited' THEN '{
            "tasksPerDay": -1,
            "backgroundMode": true,
            "aiProviders": ["openai", "anthropic", "azure_openai"],
            "maxConcurrentTasks": 5,
            "taskHistory": 90,
            "features": ["basic_automation", "advanced_automation", "task_scheduling", "custom_workflows"]
        }'::JSON
        WHEN 'business' THEN '{
            "tasksPerDay": -1,
            "backgroundMode": true,
            "aiProviders": ["openai", "anthropic", "azure_openai", "bedrock"],
            "maxConcurrentTasks": 10,
            "taskHistory": 365,
            "features": ["basic_automation", "advanced_automation", "task_scheduling", "custom_workflows", "team_collaboration"]
        }'::JSON
        WHEN 'enterprise' THEN '{
            "tasksPerDay": -1,
            "backgroundMode": true,
            "aiProviders": ["openai", "anthropic", "azure_openai", "bedrock"],
            "maxConcurrentTasks": -1,
            "taskHistory": -1,
            "features": ["basic_automation", "advanced_automation", "task_scheduling", "custom_workflows", "team_collaboration", "sso", "audit_logs"]
        }'::JSON
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old task history based on tier limits
CREATE OR REPLACE FUNCTION public.cleanup_task_history()
RETURNS void AS $$
BEGIN
    -- Free tier: keep 7 days
    DELETE FROM public.task_history 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE subscription_tier = 'free'
    ) AND created_at < NOW() - INTERVAL '7 days';
    
    -- Pro tier: keep 30 days
    DELETE FROM public.task_history 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE subscription_tier = 'pro'
    ) AND created_at < NOW() - INTERVAL '30 days';
    
    -- Unlimited tier: keep 90 days
    DELETE FROM public.task_history 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE subscription_tier = 'unlimited'
    ) AND created_at < NOW() - INTERVAL '90 days';
    
    -- Business tier: keep 365 days
    DELETE FROM public.task_history 
    WHERE user_id IN (
        SELECT id FROM public.users WHERE subscription_tier = 'business'
    ) AND created_at < NOW() - INTERVAL '365 days';
    
    -- Enterprise tier: keep everything (no cleanup)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

