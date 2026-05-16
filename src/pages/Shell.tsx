import { useState } from "react";
import { Home, User } from "lucide-react";
import HomePage from "./Home";
import ProfilePage from "./Profile";

type Tab = "home" | "profile";

export default function Shell() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0f0f1a", overscrollBehavior: "none" }}>
      {/* Page content */}
      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "none" }}>
        {tab === "home"    && <HomePage />}
        {tab === "profile" && <ProfilePage />}
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: "flex",
        flexShrink: 0,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "#0f0f1a",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {([
          { id: "home",    Icon: Home, label: "Home"    },
          { id: "profile", Icon: User, label: "Profile" },
        ] as { id: Tab; Icon: any; label: string }[]).map(({ id, Icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "12px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tab === id ? "#f97316" : "#64748b",
            fontSize: 11,
            fontWeight: 600,
            transition: "color 0.15s",
          }}>
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
