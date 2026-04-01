import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area,
  ResponsiveContainer, YAxis, XAxis, Tooltip
} from "recharts";
import Head from "next/head";

// ── ECG waveform math ──
let ecgPhase = 0;
function nextECGSample(hr) {
  const bps = (hr || 72) / 60;
  ecgPhase += bps * 0.04;
  if (ecgPhase >= 1) ecgPhase -= 1;
  const t = ecgPhase;
  let v = 0;
  if (t > 0.05 && t < 0.15)  v = 0.25 * Math.sin(Math.PI * (t - 0.05) / 0.10);
  else if (t > 0.17 && t < 0.20) v = -0.15;
  else if (t > 0.20 && t < 0.27) v = Math.sin(Math.PI * (t - 0.20) / 0.07);
  else if (t > 0.27 && t < 0.32) v = -0.20 * Math.sin(Math.PI * (t - 0.27) / 0.05);
  else if (t > 0.38 && t < 0.55) v = 0.35 * Math.sin(Math.PI * (t - 0.38) / 0.17);
  return +(v + (Math.random() - 0.5) * 0.025).toFixed(3);
}

// ── Radial gauge SVG ──
function RadialGauge({ value, min, max, unit, label, color, size = 140 }) {
  const pct     = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle   = -140 + pct * 280;
  const r       = size * 0.38;
  const cx      = size / 2;
  const cy      = size / 2 + 10;
  const startA  = (-140 * Math.PI) / 180;
  const endA    = ((angle) * Math.PI) / 180;
  const arcX1   = cx + r * Math.cos(startA);
  const arcY1   = cy + r * Math.sin(startA);
  const arcX2   = cx + r * Math.cos(endA);
  const arcY2   = cy + r * Math.sin(endA);
  const large   = pct > 0.5 ? 1 : 0;
  const needleX = cx + (r - 6) * Math.cos(endA);
  const needleY = cy + (r - 6) * Math.sin(endA);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* bg track */}
      <path
        d={`M ${cx + r * Math.cos(startA)} ${cy + r * Math.sin(startA)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos((140 * Math.PI) / 180)} ${cy + r * Math.sin((140 * Math.PI) / 180)}`}
        fill="none" stroke="#1a2535" strokeWidth="8" strokeLinecap="round"
      />
      {/* value arc */}
      {pct > 0 && (
        <path
          d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 ${large} 1 ${arcX2} ${arcY2}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        />
      )}
      {/* needle dot */}
      <circle cx={needleX} cy={needleY} r="4" fill={color} />
      {/* center value */}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white"
        fontSize="22" fontWeight="700" fontFamily="'Share Tech Mono', monospace">
        {typeof value === "number" ? value.toFixed(value < 10 ? 2 : 1) : "--"}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b"
        fontSize="10" fontFamily="'Share Tech Mono', monospace">
        {unit}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill="#94a3b8"
        fontSize="9" fontFamily="'Exo 2', sans-serif" letterSpacing="1">
        {label}
      </text>
    </svg>
  );
}

// ── Status badge ──
function StatusBadge({ status }) {
  const cfg = {
    "NORMAL":        { bg: "#0d2e1a", border: "#16a34a", text: "#4ade80", dot: "#22c55e" },
    "WARNING":       { bg: "#2e1e08", border: "#d97706", text: "#fbbf24", dot: "#f59e0b" },
    "CRITICAL":      { bg: "#2e0d0d", border: "#dc2626", text: "#f87171", dot: "#ef4444" },
    "FALL DETECTED": { bg: "#2e0d0d", border: "#dc2626", text: "#f87171", dot: "#ef4444" },
  };
  const c = cfg[status] || cfg["NORMAL"];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 999, padding: "6px 16px",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: c.dot,
        boxShadow: `0 0 6px ${c.dot}`,
        animation: status !== "NORMAL" ? "blink 0.8s infinite" : "none",
      }} />
      <span style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 13, fontWeight: 700, color: c.text, letterSpacing: 2,
      }}>{status}</span>
    </div>
  );
}

export default function Dashboard() {
  const [data,      setData]      = useState(null);
  const [ecgBuf,    setEcgBuf]    = useState(Array(80).fill({ v: 0 }));
  const [hrHistory, setHrHistory] = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [tick,      setTick]      = useState(0);
  const [lastStatus, setLastStatus] = useState("NORMAL");
  const [connected,  setConnected]  = useState(false);

  // Fetch from API route every 2s
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/telemetry");
        const json = await res.json();
        setData(json);
        setConnected(!json.simulated);

        // ECG buffer
        setEcgBuf(prev => {
          const next = [...prev, { v: nextECGSample(json.heartRate) }];
          return next.slice(-80);
        });

        // HR history
        setHrHistory(prev => {
          const next = [...prev, { t: tick, hr: json.heartRate }];
          return next.slice(-30);
        });

        // Alert log
        if (json.workerStatus !== lastStatus) {
          const now = new Date();
          const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
            .map(n => String(n).padStart(2, "0")).join(":");
          setAlerts(prev => [{
            time,
            msg: json.workerStatus,
            type: json.workerStatus === "NORMAL" ? "ok" : json.riskScore >= 60 ? "critical" : "warning",
            hr: json.heartRate?.toFixed(1),
            spo2: json.spo2?.toFixed(1),
          }, ...prev].slice(0, 12));
          setLastStatus(json.workerStatus);
        }

        setTick(t => t + 1);
      } catch (e) {
        setConnected(false);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 2000);
    return () => clearInterval(id);
  }, [lastStatus, tick]);

  const d = data || {};
  const riskColor = (d.riskScore || 0) >= 60 ? "#ef4444" : (d.riskScore || 0) >= 30 ? "#f59e0b" : "#22c55e";

  return (
    <>
      <Head>
        <title>Pulse Shield — Digital Twin</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050d18; color: #e2e8f0; font-family: 'Exo 2', sans-serif;
               min-height: 100vh; overflow-x: hidden; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        .card { background: #0a1628; border: 1px solid #1e2d45; border-radius: 12px; padding: 20px; }
        .card-title { font-family:'Share Tech Mono',monospace; font-size:10px; letter-spacing:3px;
                      color:#475569; text-transform:uppercase; margin-bottom:12px; }
        .mono { font-family:'Share Tech Mono',monospace; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1e2d45; border-radius:2px; }
      `}</style>

      {/* Grid lines background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(30,45,69,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,45,69,0.3) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", padding: "0 0 32px" }}>

        {/* ── HEADER ── */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid #1e2d45",
          background: "rgba(10,22,40,0.95)",
          backdropFilter: "blur(10px)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Logo pulse circle */}
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s ease-in-out infinite",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 800, fontSize: 20,
                            letterSpacing: 3, color: "#22c55e" }}>PULSE SHIELD</div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10,
                            color: "#475569", letterSpacing: 2 }}>DIGITAL TWIN — REAL-TIME MONITORING</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Connection badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
              background: connected ? "rgba(34,197,94,0.08)" : "rgba(251,191,36,0.08)",
              border: `1px solid ${connected ? "#16a34a" : "#d97706"}`,
              borderRadius: 999, fontSize: 11,
              fontFamily: "'Share Tech Mono',monospace",
              color: connected ? "#4ade80" : "#fbbf24",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: connected ? "#22c55e" : "#f59e0b",
                animation: "blink 1s infinite",
              }} />
              {connected ? "THINGSBOARD LIVE" : "SIMULATED DATA"}
            </div>

            {data && <StatusBadge status={d.workerStatus || "NORMAL"} />}

            {/* Clock */}
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: "#475569" }}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </header>

        {/* ── WORKER INFO BAR ── */}
        <div style={{
          display: "flex", gap: 0, padding: "0 32px",
          borderBottom: "1px solid #1e2d45",
          background: "rgba(10,22,40,0.8)",
        }}>
          {[
            ["Worker", "Y. Lohitha — W-001"],
            ["Location", "BVRIT Campus, ECE Lab"],
            ["Device", "PulseShield v1.0"],
            ["Network", "4G LTE — SIM7600EI"],
            ["Platform", "ThingsBoard Digital Twin"],
            ["Risk Score", `${d.riskScore ?? 0} / 100`],
          ].map(([label, val], i) => (
            <div key={i} style={{
              padding: "10px 24px", borderRight: "1px solid #1e2d45",
            }}>
              <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2,
                            textTransform: "uppercase", marginBottom: 2,
                            fontFamily: "'Share Tech Mono',monospace" }}>{label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8",
                            fontFamily: "'Share Tech Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "auto auto auto",
          gap: 16, padding: "24px 32px",
        }}>

          {/* ── GAUGES ── */}
          {[
            { label: "HEART RATE", value: d.heartRate, unit: "BPM", min: 40, max: 180, color: "#ef4444" },
            { label: "SpO₂ OXYGEN", value: d.spo2, unit: "%", min: 70, max: 100, color: "#3b82f6" },
            { label: "TEMPERATURE", value: d.temperature, unit: "°C", min: 35, max: 42, color: "#f59e0b" },
          ].map((g, i) => (
            <div key={i} className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="card-title">{g.label}</div>
              <RadialGauge {...g} size={150} />
              <div style={{
                marginTop: 8, fontSize: 10, color: "#475569",
                fontFamily: "'Share Tech Mono',monospace",
              }}>
                {g.label === "HEART RATE" && (d.heartRate > 120 ? "⚠ HIGH" : d.heartRate < 50 ? "⚠ LOW" : "NORMAL RANGE")}
                {g.label === "SpO₂ OXYGEN" && (d.spo2 < 90 ? "⚠ CRITICAL" : "NORMAL RANGE")}
                {g.label === "TEMPERATURE" && (d.temperature > 38.5 ? "⚠ FEVER" : "NORMAL RANGE")}
              </div>
            </div>
          ))}

          {/* ── RISK SCORE ── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="card-title">RISK SCORE</div>
            <RadialGauge
              value={d.riskScore || 0} min={0} max={100}
              unit="/100" label="DIGITAL TWIN RISK"
              color={riskColor} size={150}
            />
            <div style={{
              marginTop: 8, fontSize: 10, letterSpacing: 1,
              fontFamily: "'Share Tech Mono',monospace",
              color: riskColor,
            }}>
              {(d.riskScore || 0) < 30 ? "LOW RISK" : (d.riskScore || 0) < 60 ? "MODERATE" : "HIGH RISK"}
            </div>
          </div>

          {/* ── ECG CHART ── */}
          <div className="card" style={{ gridColumn: "1 / 3" }}>
            <div className="card-title">ECG — ELECTROCARDIOGRAM (AD8232)</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={ecgBuf} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <YAxis domain={[-0.3, 1.1]} hide />
                <Line
                  type="monotone" dataKey="v" stroke="#22c55e"
                  strokeWidth={1.5} dot={false} isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── HR TREND ── */}
          <div className="card" style={{ gridColumn: "3 / 5" }}>
            <div className="card-title">HEART RATE TREND</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={hrHistory} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[40, 180]} hide />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: "1px solid #1e2d45", borderRadius: 6 }}
                  labelStyle={{ display: "none" }}
                  itemStyle={{ color: "#ef4444", fontFamily: "'Share Tech Mono',monospace", fontSize: 11 }}
                  formatter={v => [`${v?.toFixed(1)} BPM`]}
                />
                <Area
                  type="monotone" dataKey="hr" stroke="#ef4444"
                  strokeWidth={1.5} fill="url(#hrGrad)" dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── GPS MAP ── */}
          <div className="card" style={{ gridColumn: "1 / 3" }}>
            <div className="card-title">GPS LOCATION — SIM7600EI GNSS</div>
            <div style={{
              position: "relative", height: 180,
              background: "#040d17", borderRadius: 8, overflow: "hidden",
              border: "1px solid #1e2d45",
            }}>
              {/* Grid */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "linear-gradient(rgba(34,197,94,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,0.06) 1px,transparent 1px)",
                backgroundSize: "30px 30px",
              }} />
              {/* Marker */}
              <div style={{
                position: "absolute",
                left: `${50 + Math.sin(tick * 0.1) * 15}%`,
                top:  `${50 + Math.cos(tick * 0.12) * 12}%`,
                transform: "translate(-50%,-50%)",
                width: 14, height: 14, borderRadius: "50%",
                background: "#22c55e", border: "2px solid white",
                boxShadow: "0 0 0 6px rgba(34,197,94,0.2)",
                transition: "left 1s ease, top 1s ease",
              }} />
              {/* Coords */}
              <div style={{
                position: "absolute", bottom: 8, left: 10,
                fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: "#22c55e", opacity: 0.7,
              }}>
                {(d.latitude || 17.8687).toFixed(6)}°N  {(d.longitude || 78.2322).toFixed(6)}°E
              </div>
              <div style={{
                position: "absolute", top: 8, right: 10,
                fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: "#475569",
              }}>BVRIT CAMPUS</div>
            </div>
          </div>

          {/* ── ALERT LOG ── */}
          <div className="card" style={{ gridColumn: "3 / 5" }}>
            <div className="card-title">ALERT LOG — RULE ENGINE</div>
            <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {alerts.length === 0 && (
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "#475569", padding: "8px 0" }}>
                  No alerts — system nominal
                </div>
              )}
              {alerts.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 6,
                  borderLeft: `3px solid ${a.type === "ok" ? "#22c55e" : a.type === "critical" ? "#ef4444" : "#f59e0b"}`,
                  background: a.type === "ok" ? "rgba(34,197,94,0.05)" : a.type === "critical" ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.05)",
                  animation: "fadeIn 0.3s ease",
                  fontFamily: "'Share Tech Mono',monospace", fontSize: 11,
                  color: a.type === "ok" ? "#4ade80" : a.type === "critical" ? "#f87171" : "#fbbf24",
                }}>
                  <span style={{ color: "#475569", marginRight: 4 }}>{a.time}</span>
                  {a.msg}
                  <span style={{ marginLeft: "auto", color: "#475569", fontSize: 10 }}>
                    HR:{a.hr}  SpO2:{a.spo2}%
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── FOOTER ── */}
        <div style={{
          textAlign: "center", padding: "16px 32px",
          borderTop: "1px solid #1e2d45",
          fontFamily: "'Share Tech Mono',monospace", fontSize: 10,
          color: "#334155", letterSpacing: 2,
        }}>
          PULSE SHIELD DIGITAL TWIN — BVRIT DEPT. OF ECE — INDUSTRY 4.0 / IIoT — {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
}
