import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";

type Phase = "scanning" | "processing" | "success" | "error";
interface Result {
  passenger?: string; seat?: number;
  origin?: string; destination?: string;
  travel_date?: string; departure?: string;
  reason?: string;
}

const QR_ID = "scanner-viewport";
const CONFIG = { fps: 10, experimentalFeatures: { useBarCodeDetectorIfSupported: true } };

export default function Scanner() {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const doneRef    = useRef(false);
  const [phase,  setPhase]  = useState<Phase>("scanning");
  const [result, setResult] = useState<Result | null>(null);
  const [count,  setCount]  = useState(0);
  const [err,    setErr]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => { if (!cancelled) start(); }, 400);
    return () => { cancelled = true; clearTimeout(t); stop(); };
  }, []);

  const start = async () => {
    try {
      const s = new Html5Qrcode(QR_ID, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = s;
      const onDecode = async (v: string) => {
        if (doneRef.current) return;
        doneRef.current = true;
        await stop();
        await scan(v);
      };
      try { await s.start({ facingMode: "environment" }, CONFIG, onDecode, () => {}); }
      catch { await s.start(
  { facingMode: "environment" },
  CONFIG,
  onDecode,
  () => {}
); }
    } catch (e: any) {
      const m = e?.message ?? "";
      setErr(m.includes("NotAllowed") || m.includes("ission")
        ? "Camera permission denied. Allow camera in browser settings and reload."
        : `Camera error: ${m}. Close other apps using camera and try again.`);
    }
  };

  const stop = async () => {
    try { if (scannerRef.current?.isScanning) await scannerRef.current.stop(); } catch { /* ignore */ }
  };

  const scan = async (v: string) => {
    setPhase("processing");
    if (!v.startsWith("BUSPAY:")) {
      setResult({ reason: "Not a valid BusPay ticket QR code." });
      setPhase("error"); return;
    }
    try {
      const { data, error } = await supabase.rpc("driver_scan_qr", { p_qr_code: v });
      if (error) throw error;
      const r = data as any;
      setResult(r);
      if (r.success) { setCount(c => c + 1); setPhase("success"); }
      else { setPhase("error"); }
    } catch (e: any) {
      setResult({ reason: e.message ?? "Scan failed." }); setPhase("error");
    }
  };

  const reset = async () => {
    doneRef.current = false;
    setResult(null); setErr(null); setPhase("scanning");
    if (scannerRef.current && !scannerRef.current.isScanning) {
      try { await scannerRef.current.start({ facingMode: "environment" }, CONFIG, async v => { if (doneRef.current) return; doneRef.current = true; await stop(); await scan(v); }, () => {}); }
      catch { try { await scannerRef.current.start(
  { facingMode: "environment" },
  CONFIG, async v => { if (doneRef.current) return; doneRef.current = true; await stop(); await scan(v); }, () => {}); } catch(e2: any) { setErr(`Restart failed: ${e2?.message}`); } }
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", background: "#000", overflow: "hidden" }}>

      {/* CSS to hide html5-qrcode injected white UI */}
      <style>{`
        #${QR_ID} > div { background: transparent !important; border: none !important; }
        #${QR_ID}__header_message,
        #${QR_ID}__status_span,
        #${QR_ID}__dashboard { display: none !important; }
        #${QR_ID}__scan_region {
          position: absolute !important; inset: 0 !important;
          width: 100% !important; height: 100% !important; border: none !important;
        }
        #${QR_ID}__scan_region video {
          width: 100% !important; height: 100% !important; object-fit: cover !important;
        }
        #${QR_ID}__scan_region img { display: none !important; }
      `}</style>

      {/* Camera — always in DOM, never hidden */}
      <div id={QR_ID} style={{ position: "absolute", inset: 0, zIndex: 0, background: "#000" }} />

      {/* Gradient overlays */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 60% at 50% 46%, transparent 0%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }} />

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: `calc(env(safe-area-inset-top) + 16px) 20px 16px` }}>
        <button onClick={() => { stop(); navigate("/"); }} style={{
          width: 40, height: 40, borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 18,
        }}>←</button>
        <span style={{ padding: "8px 20px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
          Scan Ticket
        </span>
        {count > 0
          ? <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(74,222,128,0.4)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", fontSize: 12, fontWeight: 700, color: "#4ade80" }}>
              ✓ {count}
            </div>
          : <div style={{ width: 40 }} />
        }
      </div>

      {/* Scan frame */}
      {phase === "scanning" && !err && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ position: "relative", width: 260, height: 260 }}>
            {/* Corners */}
            {[
              { top: 0, left: 0, borderTop: "3px solid #f97316", borderLeft: "3px solid #f97316", borderRadius: "16px 0 0 0" },
              { top: 0, right: 0, borderTop: "3px solid #f97316", borderRight: "3px solid #f97316", borderRadius: "0 16px 0 0" },
              { bottom: 0, left: 0, borderBottom: "3px solid #f97316", borderLeft: "3px solid #f97316", borderRadius: "0 0 0 16px" },
              { bottom: 0, right: 0, borderBottom: "3px solid #f97316", borderRight: "3px solid #f97316", borderRadius: "0 0 16px 0" },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 36, height: 36, ...s }} />
            ))}
            {/* Scan line */}
            <div style={{
              position: "absolute", left: 12, right: 12, height: 2, borderRadius: 999,
              background: "linear-gradient(90deg, transparent, #f97316, transparent)",
              boxShadow: "0 0 12px rgba(249,115,22,1)",
              animation: "scanline 2s ease-in-out infinite",
            }} />
          </div>
          <div style={{ marginTop: 24, padding: "8px 20px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
            Point camera at passenger QR code
          </div>
        </div>
      )}

      {/* Camera error */}
      {err && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 320, borderRadius: 24, border: "1px solid rgba(239,68,68,0.3)", background: "#1a1a2e", padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <p style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 20, lineHeight: 1.6 }}>{err}</p>
            <button onClick={() => { setErr(null); start(); }} style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "#f97316", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {phase === "processing" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", gap: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, border: "4px solid #f97316", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>Verifying ticket...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Result bottom sheet */}
      {(phase === "success" || phase === "error") && result && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}>
          <div style={{
            width: "100%", borderRadius: "28px 28px 0 0", padding: "24px 24px 40px",
            border: `1px solid ${phase === "success" ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
            background: phase === "success" ? "#0a1f10" : "#1f0a0a",
          }}>
            <div style={{ width: 48, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.2)", margin: "0 auto 20px" }} />

            {phase === "success" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>✅</div>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: "#4ade80", margin: "0 0 2px" }}>Boarding Confirmed!</p>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Ticket verified successfully</p>
                  </div>
                </div>
                <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.04)", padding: 16, marginBottom: 20 }}>
                  {[
                    ["Passenger", result.passenger ?? "—"],
                    ["Seat", `Seat #${result.seat}`],
                    ["Route", `${result.origin} → ${result.destination}`],
                    ["Date", result.travel_date ? format(new Date(result.travel_date), "EEE, MMM d") : "—"],
                    ["Departure", result.departure?.slice(0,5) ?? "—"],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", maxWidth: "55%", textAlign: "right" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={reset} style={{ width: "100%", padding: "16px 0", borderRadius: 16, background: "#22c55e", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  Scan Next Passenger
                </button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>❌</div>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: "#f87171", margin: "0 0 2px" }}>Scan Failed</p>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Could not verify ticket</p>
                  </div>
                </div>
                <div style={{ borderRadius: 16, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.1)", padding: 16, marginBottom: 20, textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#fca5a5", margin: 0, lineHeight: 1.5 }}>{result.reason}</p>
                </div>
                <button onClick={reset} style={{ width: "100%", padding: "16px 0", borderRadius: 16, background: "#f97316", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status pill */}
      {phase === "scanning" && !err && (
        <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom) + 32px)", left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#f97316", animation: "pulse 1.5s infinite" }} />
            Ready to Scan
            <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
          </div>
        </div>
      )}
    </div>
  );
}
