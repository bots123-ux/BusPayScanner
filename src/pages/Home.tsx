import { useEffect, useState } from "react";
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

export default function HomePage() {
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    // Philippines time
    const now = new Date();

    const philippinesNow = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Manila",
      })
    );

    const startOfDay = new Date(philippinesNow);
    startOfDay.setHours(0, 0, 0, 0);

    // COUNT
    const { count: total } = await supabase
      .from("ticket")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "boarded")
      .gte("boarded_at", startOfDay.toISOString());

    setCount(total ?? 0);

    // RECENT SCANS
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
      .gte("boarded_at", startOfDay.toISOString())
      .order("boarded_at", { ascending: false })
      .limit(15);

   setScans((data as unknown as Scan[]) ?? []);

    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Refresh when app becomes visible
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <div
      style={{
        paddingTop: "env(safe-area-inset-top)",
        color: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ padding: "40px 20px 16px" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#94a3b8",
            margin: "0 0 4px",
          }}
        >
          QR Reader
        </p>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            margin: "0 0 4px",
          }}
        >
          Dashboard 👋
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "#94a3b8",
            margin: 0,
          }}
        >
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          margin: "0 20px 16px",
          borderRadius: 24,
          background: "linear-gradient(135deg, #f97316, #ea6c0a)",
          padding: 20,
          boxShadow: "0 8px 32px rgba(249,115,22,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.7)",
                margin: "0 0 4px",
              }}
            >
              Today's Boarding
            </p>

            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "#fff",
                margin: "0 0 4px",
                lineHeight: 1,
              }}
            >
              {count}
            </p>

            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                margin: 0,
              }}
            >
              {count === 1
                ? "Passenger boarded"
                : "Passengers boarded"}
            </p>
          </div>

          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={32} color="#fff" />
          </div>
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

      {/* Recent scans */}
      <div style={{ padding: "0 20px 24px" }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 12,
          }}
        >
          Recent Scans
        </p>

        {loading ? (
          <p>Loading...</p>
        ) : scans.length === 0 ? (
          <p>No scans yet today</p>
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
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(34,197,94,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={20} color="#4ade80" />
              </div>

              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    margin: "0 0 2px",
                  }}
                >
                  {s.trips?.routes?.origin ?? "—"} →{" "}
                  {s.trips?.routes?.destination ?? "—"}
                </p>

                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    margin: 0,
                  }}
                >
                  Seat #{s.seat_number}
                </p>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#475569",
                }}
              >
                <Clock size={12} />
                {format(new Date(s.boarded_at), "h:mm a")}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}