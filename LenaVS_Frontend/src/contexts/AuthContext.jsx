import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState("free");

  const fetchUserData = async (userId) => {
    try {
      if (!userId) return;

      const { data, error } = await supabase
        .from("users")
        .select("credits, plan")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao buscar dados do usuário:", error.message);
        setCredits(0);
        setPlan("free");
        return;
      }

      setCredits(data?.credits ?? 0);
      setPlan(data?.plan ?? "free");
    } catch (err) {
      console.error("Erro inesperado fetchUserData:", err);
      setCredits(0);
      setPlan("free");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro getSession:", error.message);
        }

        const currentSession = data?.session ?? null;

        if (!isMounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          fetchUserData(currentSession.user.id);
        }
      } catch (err) {
        console.error("Erro inesperado initializeAuth:", err);
      } finally {
        if (isMounted) {
          setLoading(false); // 🔥 nunca trava
        }
      }
    };

    initializeAuth
