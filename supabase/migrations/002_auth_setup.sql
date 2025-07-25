-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Task history policies
CREATE POLICY "Users can view own task history" ON public.task_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task history" ON public.task_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscription history policies
CREATE POLICY "Users can view own subscription history" ON public.subscription_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription history" ON public.subscription_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to reset daily task count
CREATE OR REPLACE FUNCTION public.reset_daily_tasks()
RETURNS void AS $$
BEGIN
    UPDATE public.users 
    SET tasks_used_today = 0, tasks_reset_date = CURRENT_DATE
    WHERE tasks_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create a task
CREATE OR REPLACE FUNCTION public.can_create_task(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    tier_limit INTEGER;
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Reset daily count if needed
    IF user_record.tasks_reset_date < CURRENT_DATE THEN
        UPDATE public.users 
        SET tasks_used_today = 0, tasks_reset_date = CURRENT_DATE
        WHERE id = user_uuid;
        user_record.tasks_used_today := 0;
    END IF;
    
    -- Get tier limit
    tier_limit := CASE user_record.subscription_tier
        WHEN 'free' THEN 5
        WHEN 'pro' THEN 50
        ELSE -1 -- unlimited for unlimited, business, enterprise
    END CASE;
    
    -- Check if unlimited or under limit
    RETURN tier_limit = -1 OR user_record.tasks_used_today < tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment task count
CREATE OR REPLACE FUNCTION public.increment_task_count(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.users 
    SET tasks_used_today = tasks_used_today + 1
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

