import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showIos, setShowIos] = useState(false);

 useEffect(() => {
  if (window.matchMedia("(display-mode: standalone)").matches) {
    setInstalled(true);
  }

  const prompt = (window as any).__install_prompt;

  if (prompt) {
    setInstallPrompt(prompt);
  }

  const handler = (e: any) => {
    e.preventDefault();
    setInstallPrompt(e);
  };

  window.addEventListener("beforeinstallprompt", handler);

  window.addEventListener("appinstalled", () => {
    setInstalled(true);
  });

  return () => {
    window.removeEventListener("beforeinstallprompt", handler);
  };
}, []);

const handleLogin = async (e: FormEvent) => {
  e.preventDefault();
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    toast.error("Invalid email or password");
    setLoading(false);
    return;
  }

  navigate("/", { replace: true });
  setLoading(false);
};

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") { setInstalled(true); setInstallPrompt(null); }
    } else if (isIos) {
      setShowIos(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f1a] px-6"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-orange-500/30 bg-[#1a1a2e] shadow-xl shadow-orange-500/10">
          <img src="/icons/icon-192x192.png" alt="QR Reader" className="h-20 w-20 rounded-2xl" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white">QR Reader</h1>
          <p className="mt-1 text-sm text-slate-400">BusPay Boarding Verification</p>
        </div>
      </div>

      {/* Install banner — shown if not installed */}
      {!installed && (installPrompt || isIos) && (
        <button onClick={handleInstall}
          className="mb-6 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 py-3 text-sm font-semibold text-orange-400 active:scale-[0.98] transition-all">
          ⬇ Install QR Reader App
        </button>
      )}

      {/* Login form */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Driver email" required autoComplete="email"
          className="w-full rounded-2xl border border-white/10 bg-[#1a1a2e] px-5 py-4 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" required autoComplete="current-password"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          className="w-full rounded-2xl border border-white/10 bg-[#1a1a2e] px-5 py-4 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none" />
        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center rounded-2xl bg-orange-500 py-4 font-bold text-white hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] transition-all">
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Sign In"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-slate-600 max-w-xs">
        Only authorized BusPay driver accounts can access this app.
      </p>

      {/* iOS modal */}
      {showIos && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm" onClick={() => setShowIos(false)}>
          <div className="w-full rounded-t-3xl border-t border-white/10 bg-[#1a1a2e] p-6" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />
            <h3 className="mb-4 text-xl font-extrabold">Install on iPhone</h3>
            {["Open this page in Safari","Tap the Share button (□↑) at the bottom","Tap Add to Home Screen","Tap Add — QR Reader icon appears!"].map((t,i) => (
              <div key={i} className="mb-3 flex items-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">{i+1}</div>
                <p className="pt-0.5 text-sm text-slate-300">{t}</p>
              </div>
            ))}
            <button onClick={() => setShowIos(false)} className="mt-3 w-full rounded-2xl bg-orange-500 py-4 font-bold">Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}