import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { format, isToday, isYesterday } from "date-fns";
import { History, CheckCircle2, Clock, ChevronDown, ChevronUp, Inbox } from "lucide-react";

interface ScanRecord {
  id: string;
  ticket_id: string;
  passenger_name: string | null;
  seat_number: number;
  origin: string;
  destination: string;
  travel_date: string;
  departure_time: string;
  boarded_at: string;
  scan_date: string;
}

interface DayGroup {
  date: string;
  scans: ScanRecord[];
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isToday(d))     return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d, yyyy");
}

export default function HistoryPage() {
  const [groups, setGroups]       = useState<DayGroup[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});
  const [totalScans, setTotal]    = useState(0);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("driver_get_scan_history", {
      p_limit: 500,
      p_offset: 0,
    });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const records = data as ScanRecord[];
    setTotal(records.length);

    // Group by scan_date
    const map: Record<string, ScanRecord[]> = {};
    for (const r of records) {
      const key = r.scan_date;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }

    const sorted: DayGroup[] = Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({ date, scans: map[date] }));

    setGroups(sorted);

    // Auto-expand first (most recent) day
    if (sorted.length > 0) {
      setExpanded({ [sorted[0].date]: true });
    }

    setLoading(false);
  };

  const toggle = (date: string) =>
    setExpanded((prev) => ({ ...prev, [date]: !prev[date] }));

  return (
    <div style={{ paddingTop: "env(safe-area-inset-top)", color: "#fff", minHeight: "100%" }}>

      {/* Header */}
      <div style={{ padding: "40px 20px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 4px" }}>
          Audit Log
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
          <History size={22} color="#f97316" />
          Scan History
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
          {totalScans} total scans archived · auto-updates at midnight
        </p>
      </div>

      {/* Info banner */}
      <div style={{ margin: "0 20px 16px", borderRadius: 16, border: "1px solid rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.08)", padding: "12px 16px" }}>
        <p style={{ fontSize: 12, color: "#fb923c", margin: 0, lineHeight: 1.5 }}>
          📋 Scans from the previous day are automatically archived here at midnight (PH time). Today's live scans appear on the Home tab.
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: "0 20px 100px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 64, borderRadius: 16, background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Inbox size={48} color="#334155" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "#475569", margin: "0 0 8px" }}>No history yet</p>
            <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>
              Archived scans will appear here after midnight.
            </p>
          </div>
        ) : (
          groups.map(({ date, scans }) => {
            const open = !!expanded[date];
            return (
              <div key={date} style={{ marginBottom: 12 }}>

                {/* Day header — tappable to expand/collapse */}
                <button
                  onClick={() => toggle(date)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: open ? "16px 16px 0 0" : 16,
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderBottom: open ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: "0 0 2px" }}>
                      {formatDayLabel(date)}
                    </p>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                      {scans.length} {scans.length === 1 ? "passenger" : "passengers"} boarded
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(249,115,22,0.15)",
                      border: "1px solid rgba(249,115,22,0.3)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#f97316",
                    }}>
                      {scans.length}
                    </div>
                    {open
                      ? <ChevronUp size={16} color="#64748b" />
                      : <ChevronDown size={16} color="#64748b" />}
                  </div>
                </button>

                {/* Scan rows */}
                {open && (
                  <div style={{
                    borderRadius: "0 0 16px 16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderTop: "none",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    {scans.map((s, idx) => (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderBottom: idx < scans.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        }}
                      >
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "rgba(34,197,94,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <CheckCircle2 size={18} color="#4ade80" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.passenger_name ?? "Unknown Passenger"}
                          </p>
                          <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                            {s.origin} → {s.destination} · Seat #{s.seat_number}
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
                            <Clock size={10} />
                            {format(new Date(s.boarded_at), "h:mm a")}
                          </div>
                          <p style={{ fontSize: 10, color: "#334155", margin: 0 }}>
                            {format(new Date(s.travel_date + "T00:00:00"), "MMM d")} · {s.departure_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Day summary footer */}
                    <div style={{
                      padding: "10px 16px",
                      background: "rgba(249,115,22,0.05)",
                      borderTop: "1px solid rgba(249,115,22,0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        First scan: {format(new Date(scans[scans.length - 1].boarded_at), "h:mm a")}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        Last scan: {format(new Date(scans[0].boarded_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  );
}