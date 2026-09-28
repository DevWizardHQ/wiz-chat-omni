import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  updatePreferredModel: (model: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116: no rows returned - create default profile
        if (error.code === 'PGRST116') {
          const defaultProfile: UserProfile = {
            id: userId,
            display_name: 'Wiz User',
            avatar_url: null,
            preferred_model: 'openai/gpt-4o-mini',
            created_at: new Date().toISOString(),
          };
          setProfile(defaultProfile);
        } else {
          console.error('Error fetching profile:', error);
          setProfile(null);
        }
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  // Sign in as guest
  const signInAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsGuest(false);
      setLoading(false);
    }
  };

  // Update preferred model
  const updatePreferredModel = async (model: string) => {
    // Update state immediately
    if (profile) {
      setProfile({ ...profile, preferred_model: model });
    }

    // Persist to database if user exists
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              preferred_model: model,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.error('Error updating preferred model:', error);
        }
      } catch (err) {
        console.error('Unexpected error updating preferred model:', err);
      }
    }
  };

  // Initialize session and auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
          setIsGuest(true);
        } else if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setIsGuest(false);

          // Fetch profile if user exists
          if (data.session.user) {
            await fetchProfile(data.session.user.id);
          }
        } else {
          setSession(null);
          setUser(null);
          setIsGuest(true);
        }
      } catch (err) {
        console.error('Unexpected error initializing auth:', err);
        setSession(null);
        setUser(null);
        setIsGuest(true);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsGuest(false);
        await fetchProfile(session.user.id);
      } else {
        setIsGuest(true);
        setProfile(null);
      }
    });

    // Unsubscribe on unmount
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isGuest,
    signInAsGuest,
    signOut,
    updatePreferredModel,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
