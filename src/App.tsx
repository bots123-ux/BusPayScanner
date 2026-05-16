import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Shell from "./pages/Shell";
import Scanner from "./pages/Scanner";
import type { Session } from "@supabase/supabase-js";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const [allowed, setAllowed] = useState<boolean | null>(null); // null = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (!s) setAllowed(null); // reset when logged out
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || session === "loading") return;
    setAllowed(null); // reset while checking
    supabase.rpc("is_driver_or_admin").then(({ data }) => setAllowed(!!data));
  }, [session]);

  // Still loading session or waiting for role check — show spinner
  if (session === "loading" || (session && allowed === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!allowed) {
    supabase.auth.signOut();
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/scan"  element={<AuthGuard><Scanner /></AuthGuard>} />
        <Route path="/*"     element={<AuthGuard><Shell /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
}