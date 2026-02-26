import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState("free");

  const fetchUserData = async (userId) => {
    if (!userId) return;

    const { data } = await supabase
      .from("users")
      .select("credits, plan")
      .eq("id", userId)
      .maybeSingle();

    setCredits(data?.credits ?? 0);
    setPlan(data?.plan ?? "free");
  };

  useEffect(() => {
    // 🔥 1️⃣ RESTAURA SESSÃO AO CARREGAR O SITE
    const getInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      setSession(currentSession ?? null);

      if (currentSession?.user) {
        await fetchUserData(currentSession.user.id);
      }

      setLoading(false);
    };

    getInitialSession();

    // 🔥 2️⃣ ESCUTA LOGIN / LOGOUT
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession ?? null);

        if (newSession?.user) {
          await fetchUserData(newSession.user.id);
        } else {
          setCredits(0);
          setPlan("free");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, name) => {
    await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    await supabase.auth.signInWithPassword({ email, password });
  };

  const signIn = async (email, password) => {
    await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCredits(0);
    setPlan("free");
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        loading, // 🔥 AGORA ESTÁ SENDO EXPOSTO
        credits,
        plan,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
