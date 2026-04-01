import { useState, useEffect, useRef } from "react";
import Head from "next/head";

// ── ECG generator ──
let ecgPhase = 0;
function nextECG(hr = 72) {
  ecgPhase += (hr / 60) * 0.04;
  if (ecgPhase >= 1) ecgPhase -= 1;
  const t = ecgPhase;
  let v = 0;
  if (t > 0.05 && t < 0.15)  v = 0.25 * Math.sin(Math.PI * (t - 0.05) / 0.10);
  else if (t > 0.17 && t < 0.20) v = -0.15;
  else if (t > 0.20 && t < 0.27) v = Math.sin(Math.PI * (t - 0.20) / 0.07);
  else if (t > 0.27 && t < 0.32) v = -0.20 * Math.sin(Math.PI * (t - 0.27) / 0.05);
  else if (t > 0.38 && t < 0.55) v = 0.35 * Math.sin(Math.PI * (t - 0.38) / 0.17);
  return +(v + (Math.random() - 0.5) * 0.02).toFixed(3);
}

// ── Donut chart SVG ──
function Donut({ segments, size = 120, stroke = 18 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  let offset = 0;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <svg width={size} height={size} style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.12))" }}>
      {segments.map((s, i) => {
        const dash = (s.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center",
                     transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

// ── Mini bar chart ──
function MiniBar({ values, color }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          width: 6, borderRadius: 3,
          height: `${(v / max) * 100}%`,
          background: color,
          opacity: 0.5 + (i / values.length) * 0.5,
          transition: "height 0.4s ease",
        }} />
      ))}
    </div>
  );
}

// ── ECG Canvas ──
function ECGCanvas({ data }) {
  const canvasRef = useRef();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // grid
    ctx.strokeStyle = "rgba(99,102,241,0.08)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // wave
    if (data.length < 2) return;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(99,102,241,0)");
    grad.addColorStop(0.3, "#6366f1");
    grad.addColorStop(1, "#6366f1");
    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.shadowColor = "#6366f1";
    ctx.shadowBlur = 8;
    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h / 2 - d.v * (h * 0.38);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [data]);
  return <canvas ref={canvasRef} width={460} height={90}
    style={{ width: "100%", height: 90, borderRadius: 8 }} />;
}

// ── 3D Stat card ──
function StatCard({ label, value, unit, color, icon, sub, mini }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white", borderRadius: 16, padding: "20px",
        boxShadow: hovered
          ? `0 20px 60px rgba(0,0,0,0.12), 0 0 0 2px ${color}30`
          : "0 4px 24px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
        cursor: "default", position: "relative", overflow: "hidden",
      }}>
      {/* bg blob */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: `${color}15`,
        transition: "transform 0.3s",
        transform: hovered ? "scale(1.5)" : "scale(1)",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1,
                        textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1e293b",
                        fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
            {typeof value === "number" ? value.toFixed(value < 10 ? 2 : 1) : "--"}
            <span style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8", marginLeft: 4 }}>{unit}</span>
          </div>
          {sub && <div style={{ fontSize: 11, color: color, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>{icon}</div>
      </div>
      {mini && (
        <div style={{ marginTop: 12 }}>
          <MiniBar values={mini} color={color} />
        </div>
      )}
    </div>
  );
}

// ── Alert row ──
function AlertRow({ icon, label, value, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0", borderBottom: "1px solid #f1f5f9",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color,
                      boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 800, color: "#1e293b",
                     fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  );
}

// ── Sidebar nav item ──
function NavItem({ icon, active, label }) {
  return (
    <div title={label} style={{
      width: 44, height: 44, borderRadius: 12, display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
      background: active ? "#6366f1" : "transparent",
      boxShadow: active ? "0 4px 16px rgba(99,102,241,0.4)" : "none",
      transition: "all 0.2s", fontSize: 18, color: active ? "white" : "#94a3b8",
      marginBottom: 8,
    }}>{icon}</div>
  );
}

export default function Dashboard() {
  const [data,     setData]     = useState(null);
  const [ecgBuf,   setEcgBuf]   = useState(Array(80).fill({ v: 0 }));
  const [hrHist,   setHrHist]   = useState(Array(10).fill(72));
  const [spo2Hist, setSpo2Hist] = useState(Array(10).fill(98));
  const [tempHist, setTempHist] = useState(Array(10).fill(36.8));
  const [alerts,   setAlerts]   = useState([]);
  const [tick,     setTick]     = useState(0);
  const [lastSt,   setLastSt]   = useState("NORMAL");
  const [time,     setTime]     = useState("");
  const [connected,setConnected]= useState(false);
  const [active,   setActive]   = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/telemetry");
        const json = await res.json();
        setData(json);
        setConnected(!json.simulated);
        setEcgBuf(prev => [...prev, { v: nextECG(json.heartRate) }].slice(-80));
        setHrHist(prev => [...prev, json.heartRate].slice(-10));
        setSpo2Hist(prev => [...prev, json.spo2].slice(-10));
        setTempHist(prev => [...prev, json.temperature].slice(-10));
        if (json.workerStatus !== lastSt) {
          const t = new Date().toLocaleTimeString();
          setAlerts(prev => [{
            time: t, msg: json.workerStatus,
            type: json.workerStatus === "NORMAL" ? "ok" : json.riskScore >= 60 ? "critical" : "warn",
            hr: json.heartRate?.toFixed(1), spo2: json.spo2?.toFixed(1),
          }, ...prev].slice(0, 10));
          setLastSt(json.workerStatus);
        }
        setTick(t => t + 1);
      } catch (e) { setConnected(false); }
    }
    fetchData();
    const id = setInterval(fetchData, 2000);
    return () => clearInterval(id);
  }, [lastSt]);

  const d = data || {};
  const hr   = d.heartRate    || 72;
  const spo2 = d.spo2         || 98;
  const temp = d.temperature  || 36.8;
  const risk = d.riskScore    || 0;
  const stat = d.workerStatus || "NORMAL";

  const statusColor = stat === "NORMAL" ? "#22c55e" : stat === "WARNING" ? "#f59e0b" : "#ef4444";

  const donutSegs = [
    { value: Math.max(0, 100 - risk), color: "#6366f1" },
    { value: risk > 0 ? risk * 0.6 : 0, color: "#f59e0b" },
    { value: risk >= 60 ? risk * 0.4 : 0, color: "#ef4444" },
  ];

  return (
    <>
      <Head>
        <title>Pulse Shield — Digital Twin</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; color: #1e293b; font-family: 'DM Sans', sans-serif;
               min-height: 100vh; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes spin3d { 0%{transform:rotateY(0)} 100%{transform:rotateY(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
        .fade-up { animation: fadeUp 0.5s ease both; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: 72, background: "white", display: "flex", flexDirection: "column",
          alignItems: "center", padding: "20px 0", gap: 0,
          borderRight: "1px solid #f1f5f9",
          boxShadow: "4px 0 24px rgba(0,0,0,0.04)",
          position: "sticky", top: 0, height: "100vh", zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: "#6366f1",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 28, boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            animation: "float 3s ease-in-out infinite",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>

          {[
            { icon: "⊞", label: "Dashboard" },
            { icon: "📈", label: "Analytics" },
            { icon: "🔔", label: "Alerts" },
            { icon: "📋", label: "Reports" },
            { icon: "📦", label: "Devices" },
            { icon: "⚙", label: "Settings" },
          ].map((item, i) => (
            <NavItem key={i} icon={item.icon} label={item.label} active={active === i}
              onClick={() => setActive(i)} />
          ))}

          <div style={{ marginTop: "auto" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 13, fontWeight: 700,
            }}>YL</div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, overflow: "auto" }}>

          {/* ── TOP NAV ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 28px", background: "white",
            borderBottom: "1px solid #f1f5f9",
            position: "sticky", top: 0, zIndex: 9,
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Dashboard</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                BVRIT — Dept. of ECE &nbsp;·&nbsp; {time}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Live badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                background: connected ? "#f0fdf4" : "#fefce8",
                border: `1px solid ${connected ? "#bbf7d0" : "#fde68a"}`,
                borderRadius: 999, fontSize: 12, fontWeight: 600,
                color: connected ? "#16a34a" : "#d97706",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%",
                  background: connected ? "#22c55e" : "#f59e0b",
                  display: "inline-block", animation: "pulse 1s infinite" }} />
                {connected ? "ThingsBoard Live" : "Simulated"}
              </div>

              {/* Status */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                background: `${statusColor}12`,
                border: `1px solid ${statusColor}40`,
                borderRadius: 999, fontSize: 12, fontWeight: 700, color: statusColor,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%",
                  background: statusColor, display: "inline-block",
                  animation: stat !== "NORMAL" ? "pulse 0.6s infinite" : "none" }} />
                {stat}
              </div>

              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: 13,
              }}>YL</div>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div style={{ padding: "24px 28px" }}>

            {/* ── ROW 1: Title card + donut + stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* Title card */}
              <div className="fade-up" style={{
                background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
                borderRadius: 20, padding: "24px",
                boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
                color: "white", position: "relative", overflow: "hidden",
                animationDelay: "0s",
              }}>
                {/* Floating 3D orb */}
                <div style={{
                  position: "absolute", top: -30, right: -30, width: 120, height: 120,
                  borderRadius: "50%", background: "rgba(255,255,255,0.1)",
                  animation: "float 4s ease-in-out infinite",
                }} />
                <div style={{
                  position: "absolute", bottom: -20, right: 20, width: 80, height: 80,
                  borderRadius: "50%", background: "rgba(255,255,255,0.06)",
                  animation: "float 5s ease-in-out infinite 1s",
                }} />
                <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, marginBottom: 8,
                              textTransform: "uppercase", fontWeight: 600 }}>Worker Health Status</div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>
                  Pulse Shield<br />Digital Twin
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
                  Y. Lohitha · W-001 · ECE Lab
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  {[["Normal", "#22c55e"], ["Warning", "#f59e0b"], ["Critical", "#ef4444"]].map(([l, c]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                      <span style={{ opacity: 0.8 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut card */}
              <div className="fade-up" style={{
                background: "white", borderRadius: 20, padding: "20px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", animationDelay: "0.1s",
              }}>
                <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1,
                              textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Risk Score</div>
                <div style={{ position: "relative" }}>
                  <Donut segments={donutSegs} size={110} stroke={14} />
                  <div style={{
                    position: "absolute", inset: 0, display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b",
                                  fontFamily: "'DM Mono',monospace" }}>{risk}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>/100</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  {[["Safe", "#6366f1"], ["Warn", "#f59e0b"], ["High", "#ef4444"]].map(([l, c]) => (
                    <div key={l} style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Currently Normal */}
              <div className="fade-up" style={{
                background: "white", borderRadius: 20, padding: "20px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animationDelay: "0.15s",
              }}>
                <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1,
                              textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Vital Signs</div>
                <AlertRow icon="❤" label="Heart Rate" value={`${hr.toFixed(0)}`}
                  color={hr > 120 || hr < 50 ? "#ef4444" : "#22c55e"} />
                <AlertRow icon="🫁" label="SpO2" value={`${spo2.toFixed(1)}%`}
                  color={spo2 < 90 ? "#ef4444" : "#3b82f6"} />
                <AlertRow icon="🌡" label="Temperature" value={`${temp.toFixed(1)}°`}
                  color={temp > 38.5 ? "#ef4444" : "#f59e0b"} />
              </div>

              {/* Fall + Signal */}
              <div className="fade-up" style={{
                background: "white", borderRadius: 20, padding: "20px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animationDelay: "0.2s",
              }}>
                <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1,
                              textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Status</div>
                <AlertRow label="Fall Detection" value={d.fallDetected ? "YES" : "No"}
                  color={d.fallDetected ? "#ef4444" : "#22c55e"} />
                <AlertRow label="4G Signal" value={`${d.signal ?? 26}/31`}
                  color="#6366f1" />
                <AlertRow label="Updates" value={`${tick}`} color="#8b5cf6" />
              </div>
            </div>

            {/* ── ROW 2: Stat cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
              <div className="fade-up" style={{ animationDelay: "0.25s" }}>
                <StatCard label="Heart Rate" value={hr} unit="bpm" color="#ef4444" icon="❤️"
                  sub={hr > 120 ? "⚠ HIGH" : hr < 50 ? "⚠ LOW" : "Normal range"} mini={hrHist} />
              </div>
              <div className="fade-up" style={{ animationDelay: "0.3s" }}>
                <StatCard label="SpO₂ Oxygen" value={spo2} unit="%" color="#3b82f6" icon="💧"
                  sub={spo2 < 90 ? "⚠ CRITICAL" : "Normal range"} mini={spo2Hist} />
              </div>
              <div className="fade-up" style={{ animationDelay: "0.35s" }}>
                <StatCard label="Temperature" value={temp} unit="°C" color="#f59e0b" icon="🌡️"
                  sub={temp > 38.5 ? "⚠ FEVER" : "Normal range"} mini={tempHist} />
              </div>
              <div className="fade-up" style={{ animationDelay: "0.4s" }}>
                <StatCard label="Risk Score" value={risk} unit="/100" color="#6366f1" icon="🛡️"
                  sub={risk < 30 ? "Low risk" : risk < 60 ? "Moderate" : "⚠ HIGH RISK"}
                  mini={Array(10).fill(risk)} />
              </div>
            </div>

            {/* ── ROW 3: ECG + Alert log + GPS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16 }}>

              {/* ECG */}
              <div className="fade-up" style={{
                background: "white", borderRadius: 20, padding: "20px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animationDelay: "0.45s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>ECG Waveform</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>AD8232 — Real-time PQRST</div>
                  </div>
                  <div style={{
                    padding: "4px 10px", borderRadius: 999,
                    background: "#f0f0ff", color: "#6366f1",
                    fontSize: 11, fontWeight: 600,
                  }}>LIVE</div>
                </div>
                <ECGCanvas data={ecgBuf} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  {[["P wave", "#94a3b8"], ["QRS", "#6366f1"], ["T wave", "#94a3b8"]].map(([l, c]) => (
                    <div key={l} style={{ fontSize: 10, color: c, fontWeight: 600 }}>{l}</div>
                  ))}
                </div>
              </div>

              {/* Alert log */}
              <div className="fade-up" style={{
                background: "white", borderRadius: 20, padding: "20px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animationDelay: "0.5s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>Alert Status</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{alerts.length} events</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                  {alerts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
                      No alerts — all nominal
                    </div>
                  )}
                  {alerts.map((a, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      background: a.type === "ok" ? "#f0fdf4" : a.type === "critical" ? "#fef2f2" : "#fefce8",
                      border: `1px solid ${a.type === "ok" ? "#bbf7d0" : a.type === "critical" ? "#fecaca" : "#fde68a"}`,
                      animation: "slideIn 0.3s ease",
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: a.type === "ok" ? "#22c55e" : a.type === "critical" ? "#ef4444" : "#f59e0b",
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600,
                                      color: a.type === "ok" ? "#16a34a" : a.type === "critical" ? "#dc2626" : "#d97706" }}>
                          {a.msg}
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                          {a.time} · HR:{a.hr} · SpO2:{a.spo2}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GPS map */}
              <div className="fade-up" style={{
                background: "white", borderRadius: 20, padding: "20px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animationDelay: "0.55s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>GPS Location</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>SIM7600EI GNSS</div>
                </div>

                {/* Map area */}
                <div style={{
                  position: "relative", height: 200, borderRadius: 12, overflow: "hidden",
                  background: "#e8f5e9",
                }}>
                  {/* Fake map grid */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `
                      linear-gradient(rgba(34,197,94,0.15) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(34,197,94,0.15) 1px, transparent 1px)`,
                    backgroundSize: "24px 24px",
                  }} />
                  {/* Road lines */}
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                    <line x1="0" y1="100" x2="100%" y2="100" stroke="white" strokeWidth="6" />
                    <line x1="0" y1="140" x2="100%" y2="140" stroke="white" strokeWidth="3" />
                    <line x1="120" y1="0" x2="120" y2="100%" stroke="white" strokeWidth="6" />
                    <line x1="220" y1="0" x2="220" y2="100%" stroke="white" strokeWidth="3" />
                    <text x="130" y="90" fill="#94a3b8" fontSize="9" fontFamily="DM Sans">BVRIT Campus</text>
                  </svg>
                  {/* Marker */}
                  <div style={{
                    position: "absolute",
                    left: `${50 + Math.sin(tick * 0.1) * 12}%`,
                    top:  `${50 + Math.cos(tick * 0.12) * 10}%`,
                    transform: "translate(-50%,-50%)",
                    transition: "left 1s ease, top 1s ease",
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: "#6366f1", border: "3px solid white",
                      boxShadow: "0 0 0 8px rgba(99,102,241,0.2), 0 4px 12px rgba(99,102,241,0.4)",
                    }} />
                  </div>
                </div>

                <div style={{ marginTop: 10, fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#94a3b8" }}>
                  {(d.latitude || 17.8687).toFixed(6)}°N &nbsp; {(d.longitude || 78.2322).toFixed(6)}°E
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "16px", color: "#cbd5e1", fontSize: 11 }}>
            Pulse Shield Digital Twin · BVRIT ECE · Industry 4.0 · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}
