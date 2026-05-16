import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function ProfilePage() {
  const navigate = useNavigate();
  const [name, setName]   = useState("Driver");
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("Driver");
  const [installed, setInstalled]     = useState(false);
  const [installPrompt, setPrompt]    = useState<any>(null);
  const [showIos, setShowIos]         = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email ?? "");

      const { data: p } = await supabase.from("passenger")
        .select("full_name, is_admin, is_driver")
        .eq("user_id", session.user.id).maybeSingle();
      if (p?.full_name) setName(p.full_name);
      if (p?.is_admin) setRole("Admin");
      else if (p?.is_driver) setRole("Driver");
    })();

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const prompt = (window as any).__install_prompt;
    if (prompt) setPrompt(prompt);
    const h = (e: any) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") { setInstalled(true); setPrompt(null); }
    } else if (isIos) {
      setShowIos(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
  };

  return (
    <div style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: 24, color: "#fff" }}>

      {/* Header */}
      <div style={{ padding: "40px 20px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 4px" }}>
          QR Reader
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Profile</h1>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* User card */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#f97316", flexShrink: 0 }}>
              {name[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{name}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, background: role === "Admin" ? "rgba(249,115,22,0.15)" : "rgba(59,130,246,0.15)", color: role === "Admin" ? "#f97316" : "#60a5fa", border: `1px solid ${role === "Admin" ? "rgba(249,115,22,0.3)" : "rgba(59,130,246,0.3)"}` }}>
                ◆ {role}
              </span>
            </div>
          </div>

          {[
            { label: "Email",   value: email },
            { label: "Access",  value: `${role} — QR Scanner` },
            { label: "App",     value: "QR Reader — BusPay" },
            { label: "Status",  value: installed ? "✅ Installed" : "⬡ Browser" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0, width: 56, flexShrink: 0, paddingTop: 2 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, wordBreak: "break-all" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Install button */}
        {!installed && (
          <div style={card}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>Install QR Reader App</p>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px" }}>
              Install as a standalone app — no browser URL bar, works like a native app.
            </p>
            <button onClick={handleInstall} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, background: "#f97316",
              border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              transition: "transform 0.1s",
            }}
              onTouchStart={e => (e.currentTarget.style.transform = "scale(0.97)")}
              onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}>
              {isIos ? "⬇ Add to Home Screen" : "⬇ Install App"}
            </button>
            {isIos && (
              <p style={{ fontSize: 11, color: "#475569", textAlign: "center", margin: "8px 0 0" }}>
                Safari → Share (□↑) → Add to Home Screen
              </p>
            )}
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout} style={{
          width: "100%", padding: "14px 0", borderRadius: 14,
          border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
          color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer",
          transition: "transform 0.1s",
        }}
          onTouchStart={e => (e.currentTarget.style.transform = "scale(0.97)")}
          onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}>
          Logout
        </button>
      </div>

      {/* iOS modal */}
      {showIos && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowIos(false)}>
          <div style={{ width: "100%", borderRadius: "24px 24px 0 0", borderTop: "1px solid rgba(255,255,255,0.1)", background: "#1a1a2e", padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.2)", margin: "0 auto 20px" }} />
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>Install on iPhone</h3>
            {[
              "Open this app in Safari (not Chrome)",
              "Tap the Share button (□↑) at the bottom",
              "Tap Add to Home Screen",
              "Tap Add — QR Reader icon appears!",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                <p style={{ fontSize: 14, color: "#cbd5e1", margin: 0, paddingTop: 4 }}>{t}</p>
              </div>
            ))}
            <button onClick={() => setShowIos(false)} style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "#f97316", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 8, cursor: "pointer" }}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
