import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 AuthProvider initializing...');
    console.log('🔍 FIXED: Auth system should now work with users table');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Error getting initial session:', error);
      } else {
        console.log('📱 Initial session:', session ? 'Found' : 'None');
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email || 'No user');
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle successful OAuth sign-in
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in successfully:', session.user.email);
        console.log('🔍 FIXED: Creating user profile with new system...');
        
        // Ensure user profile exists in users table (with better error handling)
        try {
          console.log('👤 Creating/updating user profile for:', session.user.id);
          
          const { data, error } = await supabase
            .from('users')
            .upsert({
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
              avatar_url: session.user.user_metadata?.avatar_url,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
            .select();
          
          if (error) {
            console.error('❌ Error creating/updating user profile:', error);
            // Don't throw error, just log it - allow user to continue
            console.warn('⚠️ Continuing without user profile creation');
          } else {
            console.log('✅ User profile created/updated successfully:', data);
          }
        } catch (error) {
          console.error('❌ Exception with user profile:', error);
          // Don't throw error, just log it - allow user to continue
          console.warn('⚠️ Continuing despite user profile error');
        }
      }

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        setSession(null);
      }

      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}`
      },
    });

    if (error) {
      console.error('Sign up error:', error);
      throw new Error(error.message);
    }

    if (data.user && !data.user.email_confirmed_at) {
      throw new Error('Please check your email and click the confirmation link to complete your registration.');
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      throw new Error(error.message);
    }

    return data;
  };

  const signInWithGoogle = async () => {
    console.log('🔗 Starting Google OAuth...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('❌ Google sign in error:', error);
      throw new Error(`Google authentication failed: ${error.message}`);
    }

    console.log('✅ Google OAuth initiated');
    return data;
  };

  const signInWithGithub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
        scopes: 'user:email',
      },
    });

    if (error) {
      console.error('GitHub sign in error:', error);
      throw new Error(`GitHub authentication failed: ${error.message}`);
    }

    return data;
  };

  const signInWithApple = async () => {
    console.log('🍎 Starting Apple OAuth...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin,
        scopes: 'name email',
      },
    });

    if (error) {
      console.error('❌ Apple sign in error:', error);
      throw new Error(`Apple authentication failed: ${error.message}`);
    }

    console.log('✅ Apple OAuth initiated');
    return data;
  };

  const signOut = async () => {
    try {
      console.log('🚪 Starting sign out process...');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Successfully signed out from Supabase');
      
      // Clear state immediately
      setUser(null);
      setSession(null);
      
      // Clear any local storage
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-' + supabase.supabaseUrl.split('//')[1] + '-auth-token');
        
        // Clear all Supabase related items
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        
        console.log('🧹 Local storage cleared');
      } catch (error) {
        console.warn('⚠️ Error clearing localStorage:', error);
      }
      
      // No need to reload, just let the auth state change handle the redirect
      console.log('✅ Sign out completed successfully');
      
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      
      // Force clear state and reload even if there's an error
      setUser(null);
      setSession(null);
      
      // Let the auth state change handle the UI update
      console.log('🔄 Fallback: State cleared manually');
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      throw new Error(error.message);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGithub,
    signInWithApple,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};