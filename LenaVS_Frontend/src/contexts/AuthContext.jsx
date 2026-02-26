import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState("free");

  // ===============================
  // Buscar dados do usuário
  // ===============================
  const fetchUserData = async (userId) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("credits, plan")
        .eq("id", userId)
        .maybeSingle(); // 🔥 evita erro se não existir linha

      if (error) {
        console.error("Erro ao buscar usuário:", error.message);
        return;
      }

      setCredits(data?.credits ?? 0);
      setPlan(data?.plan ?? "free");
    } catch (err) {
      console.error("Erro inesperado:", err);
    }
  };

  // ===============================
  // Inicialização AUTH
  // ===============================
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro getSession:", error.message);
        }

        if (!isMounted) return;

        const currentSession = data?.session ?? null;
        setSession(currentSession);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        }
      } catch (err) {
        console.error("Erro initAuth:", err);
      } finally {
        if (isMounted) setLoading(false); // 🔥 GARANTIA ABSOLUTA
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession ?? null);

      if (newSession?.user) {
        await fetchUserData(newSession.user.id);
      } else {
        setCredits(0);
        setPlan("free");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ===============================
  // Actions
  // ===============================
  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) throw error;

    await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setCredits(0);
    setPlan("free");
  };

  // ===============================
  // Loading Screen
  // ===============================
  if (loading) {
    return (
      <div
        style={{
          background: "#000",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontSize: "18px",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,

        credits,
        plan,

        signUp,
        signIn,
        signOut,

        refreshCredits: async () => {
          if (session?.user) {
            await fetchUserData(session.user.id);
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
