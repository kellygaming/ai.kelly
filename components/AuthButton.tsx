"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type SimpleUser = { id: string; name: string; avatar?: string; email?: string };
type Profile = {
  plan: string;
  credits_miniatures: number;
  credits_voice: number;
  credits_reset_at: string;
};

function mapUser(u: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
}): SimpleUser {
  return {
    id: u.id,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || "Compte",
    avatar: u.user_metadata?.avatar_url,
    email: u.email,
  };
}

export default function AuthButton({ variant = "landing" }: { variant?: "landing" | "chat" }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? mapUser(data.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setProfile(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("plan, credits_miniatures, credits_voice, credits_reset_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
  }, [user]);

  async function signIn() {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return <span className={`auth-skeleton auth-skeleton-${variant}`} aria-hidden="true" />;
  }

  // Supabase pas encore configuré : on masque le bouton plutôt que de proposer
  // une connexion qui échouerait.
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (user) {
    return (
      <div className={`auth-user auth-user-${variant}`}>
        <button className="auth-user-trigger" onClick={() => setMenuOpen((v) => !v)}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="auth-avatar" />
          ) : (
            <span className="auth-avatar auth-avatar-fallback">{user.name[0]?.toUpperCase()}</span>
          )}
          <span className="auth-name">{user.name.split(" ")[0]}</span>
        </button>
        {menuOpen && (
          <div className="auth-menu">
            <span className="auth-menu-email">{user.email}</span>
            {profile && (
              <div className="auth-menu-plan">
                <span className="auth-menu-plan-badge">
                  Plan {profile.plan === "plus" ? "Plus" : "Gratuit"}
                </span>
                <div className="auth-menu-credit-row">
                  <span>🖼️ Miniatures</span>
                  <strong>{profile.credits_miniatures}</strong>
                </div>
                <div className="auth-menu-credit-row">
                  <span>🎙️ Voix</span>
                  <strong>{profile.credits_voice}</strong>
                </div>
              </div>
            )}
            <button className="auth-menu-signout" onClick={signOut}>
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      className={variant === "landing" ? "btn btn-ghost" : "chat-signin"}
    >
      Se connecter
    </button>
  );
}
