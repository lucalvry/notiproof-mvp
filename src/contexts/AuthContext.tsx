import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "owner" | "editor" | "viewer";

interface BusinessSummary {
  id: string;
  name: string;
  role: AppRole;
  onboarding_completed?: boolean;
  install_verified?: boolean;
  suspended_at?: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  onboarding_completed: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  businesses: BusinessSummary[];
  currentBusinessId: string | null;
  currentBusinessRole: AppRole | null;
  loading: boolean;
  setCurrentBusinessId: (id: string) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(
    () => localStorage.getItem("notiproof.current_business_id")
  );
  const [loading, setLoading] = useState(true);

  const setCurrentBusinessId = (id: string) => {
    localStorage.setItem("notiproof.current_business_id", id);
    setCurrentBusinessIdState(id);
  };

  const loadUserData = async (userId: string) => {
    const [{ data: profileData }, { data: membershipData }] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("business_users")
        .select("role, business_id, businesses(id, name, onboarding_completed, install_verified, suspended_at)")
        .eq("user_id", userId),
    ]);

    setProfile(profileData as UserProfile | null);

    const list: BusinessSummary[] = (membershipData ?? [])
      .map((row: any) => row.businesses ? {
        id: row.businesses.id,
        name: row.businesses.name,
        role: row.role as AppRole,
        onboarding_completed: row.businesses.onboarding_completed,
        install_verified: row.businesses.install_verified,
        suspended_at: row.businesses.suspended_at,
      } : null)
      .filter(Boolean) as BusinessSummary[];
    setBusinesses(list);

    if (list.length > 0) {
      const stored = localStorage.getItem("notiproof.current_business_id");
      const valid = stored && list.some((b) => b.id === stored) ? stored : list[0].id;
      if (valid !== stored) localStorage.setItem("notiproof.current_business_id", valid);
      setCurrentBusinessIdState(valid);
    } else {
      setCurrentBusinessIdState(null);
    }
  };

  useEffect(() => {
    // Set up listener BEFORE checking session
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer DB calls to avoid deadlocks
        setTimeout(() => loadUserData(newSession.user.id), 0);
      } else {
        setProfile(null);
        setBusinesses([]);
        setCurrentBusinessIdState(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadUserData(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadUserData(user.id);
  };

  const signOut = async () => {
    localStorage.removeItem("notiproof.current_business_id");
    await supabase.auth.signOut();
  };

  const currentBusinessRole =
    businesses.find((b) => b.id === currentBusinessId)?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        businesses,
        currentBusinessId,
        currentBusinessRole,
        loading,
        setCurrentBusinessId,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
