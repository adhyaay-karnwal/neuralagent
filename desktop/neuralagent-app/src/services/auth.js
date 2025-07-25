import { supabase } from '../utils/supabase';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.session = null;
  }

  // Initialize auth state
  async initialize() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      this.session = session;
      this.currentUser = session?.user || null;
      
      return { user: this.currentUser, session: this.session };
    } catch (error) {
      console.error('Auth initialization error:', error);
      return { user: null, session: null, error };
    }
  }

  // Sign up with email and password
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || '',
            avatar_url: userData.avatarUrl || ''
          }
        }
      });

      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      this.session = data.session;
      this.currentUser = data.user;
      
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      this.session = null;
      this.currentUser = null;
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { user: data.user };
    } catch (error) {
      console.error('Update password error:', error);
      return { error };
    }
  }

  // Update user profile
  async updateProfile(updates) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) throw error;
      
      this.currentUser = data.user;
      return { user: data.user };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error };
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get current session
  getCurrentSession() {
    return this.session;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser && !!this.session;
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      this.session = session;
      this.currentUser = session?.user || null;
      callback(event, session);
    });
  }

  // Get user's subscription info
  async getUserSubscription() {
    if (!this.currentUser) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('users')
        .select('subscription_tier, subscription_expires_at, tasks_used_today, tasks_reset_date')
        .eq('id', this.currentUser.id)
        .single();

      if (error) throw error;
      return { subscription: data };
    } catch (error) {
      console.error('Get subscription error:', error);
      return { error };
    }
  }

  // Check if user can create a task
  async canCreateTask() {
    if (!this.currentUser) return false;

    try {
      const { data, error } = await supabase.rpc('can_create_task', {
        user_uuid: this.currentUser.id
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Can create task check error:', error);
      return false;
    }
  }

  // Get user's tier limits
  async getTierLimits() {
    if (!this.currentUser) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('get_tier_limits', {
        user_uuid: this.currentUser.id
      });

      if (error) throw error;
      return { limits: data };
    } catch (error) {
      console.error('Get tier limits error:', error);
      return { error };
    }
  }

  // Check if user has a specific feature
  async hasFeature(featureName) {
    if (!this.currentUser) return false;

    try {
      const { data, error } = await supabase.rpc('has_feature', {
        user_uuid: this.currentUser.id,
        feature_name: featureName
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Has feature check error:', error);
      return false;
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;

