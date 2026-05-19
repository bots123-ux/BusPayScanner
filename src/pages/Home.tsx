import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";

interface Scan {
  id: string;
  seat_number: number;
  boarded_at: string;
  trips: {
    routes: {
      origin: string;
      destination: string;
    } | null;
  } | null;
}

// Get start-of-day in PH time as ISO string
function getPhStartOfDay(): string {
  const now = new Date();
  const ph = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setHours(0, 0, 0, 0);
  // Convert back to UTC by finding the offset
  const offset = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const phOffset = 8 * 60 * 60 * 1000;
  const utcMidnight = new Date(ph.getTime() - phOffset);
  return utcMidnight.toISOString();
}

export default function HomePage() {
  const navigate = useNavigate();
  const [count,   setCount]   = useState(0);
  const [scans,   setScans]   = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const startISO = getPhStartOfDay();

    // Today's boarding count
    const { count: total } = await supabase
      .from("ticket")
      .select("id", { count: "exact", head: true })
      .eq("status", "boarded")
      .gte("boarded_at", startISO);

    setCount(total ?? 0);

    // Recent scans — last 15
    const { data } = await supabase
      .from("ticket")
      .select(`
        id,
        seat_number,
        boarded_at,
        trips (
          routes (
            origin,
            destination
          )
        )
      `)
      .eq("status", "boarded")
      .gte("boarded_at", startISO)
      .order("boarded_at", { ascending: false })
      .limit(15);

    setScans((data as unknown as Scan[]) ?? []);
    setLoading(false);
  };

  // Subscribe to realtime so new scans appear instantly without refresh
  const subscribeRealtime = () => {
    if (channelRef.current) return; // already subscribed
    channelRef.current = supabase
      .channel("home-boarded-tickets")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ticket" },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === "boarded") {
            fetchData(); // re-fetch to keep count + list in sync
          }
        }
      )
      .subscribe();
  };

  useEffect(() => {
    fetchData();
    subscribeRealtime();

    // Refresh when app comes back to foreground
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ paddingTop: "env(safe-area-inset-top)", color: "#fff" }}>

      {/* Header */}
      <div style={{ padding: "40px 20px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 4px" }}>
          QR Reader
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
          Dashboard 👋
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats card */}
      <div style={{
        margin: "0 20px 16px",
        borderRadius: 24,
        background: "linear-gradient(135deg, #f97316, #ea6c0a)",
        padding: 20,
        boxShadow: "0 8px 32px rgba(249,115,22,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>
              Today's Boarding
            </p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "#fff", margin: "0 0 4px", lineHeight: 1 }}>
              {count}
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              {count === 1 ? "Passenger boarded" : "Passengers boarded"}
            </p>
          </div>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={32} color="#fff" />
          </div>
        </div>

        {/* Live indicator */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#4ade80", animation: "pulse 1.5s infinite", display: "inline-block" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Live · auto-refreshes</span>
        </div>
      </div>

      {/* Scan button */}
      <div style={{ margin: "0 20px 20px" }}>
        <button
          onClick={() => navigate("/scan")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            borderRadius: 24,
            background: "#fff",
            border: "none",
            padding: "20px 0",
            fontSize: 18,
            fontWeight: 800,
            color: "#0f0f1a",
            cursor: "pointer",
          }}
        >
          <ScanLine size={24} />
          Start Scanning
        </button>
      </div>

      {/* Today's recent scans */}
      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
            Today's Scans
          </p>
          {!loading && scans.length > 0 && (
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              Showing {scans.length} most recent
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 64, borderRadius: 16, background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <ScanLine size={32} color="#334155" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>No scans yet today</p>
          </div>
        ) : (
          scans.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 16,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.04)",
                marginBottom: 8,
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(34,197,94,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <CheckCircle2 size={20} color="#4ade80" />
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                  {s.trips?.routes?.origin ?? "—"} → {s.trips?.routes?.destination ?? "—"}
                </p>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                  Seat #{s.seat_number}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
                <Clock size={12} />
                {format(new Date(s.boarded_at), "h:mm a")}
              </div>
            </div>
          ))
        )}

        {/* Note about history */}
        {!loading && scans.length > 0 && (
          <p style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 8, margin: "8px 0 0" }}>
            These scans move to History at midnight PH time
          </p>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  );
}