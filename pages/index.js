import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

// ── ECG outside component so it never causes re-render ──
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

// ── ECG Canvas — uses ref to draw, never re-renders ──
function ECGCanvas({ dataRef }) {
  const canvasRef = useRef();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const interval = setInterval(() => {
      const data = dataRef.current;
      if (!data || data.length < 2) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(99,102,241,0.07)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
      for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
      const grad = ctx.createLinearGradient(0,0,w,0);
      grad.addColorStop(0,"rgba(99,102,241,0)");
      grad.addColorStop(0.25,"#6366f1");
      grad.addColorStop(1,"#6366f1");
      ctx.beginPath(); ctx.strokeStyle = grad; ctx.lineWidth = 2;
      ctx.shadowColor = "#6366f1"; ctx.shadowBlur = 5;
      data.forEach((d, i) => {
        const x = (i/(data.length-1))*w, y = h/2 - d.v*(h*0.38);
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.stroke(); ctx.shadowBlur = 0;
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <canvas ref={canvasRef} width={500} height={90}
      style={{ width:"100%", height:90, borderRadius:8, display:"block" }} />
  );
}

// ── MiniBar ──
function MiniBar({ values, color }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:32 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          width:6, borderRadius:3,
          height:`${Math.max(4,(v/max)*100)}%`,
          background:color,
          opacity: 0.4 + (i/values.length)*0.6,
          transition:"height 0.6s ease",
        }} />
      ))}
    </div>
  );
}

// ── Donut ──
function Donut({ segments, size=120, stroke=14 }) {
  const r = (size-stroke)/2, circ = 2*Math.PI*r;
  const cx = size/2, cy = size/2;
  let offset = 0;
  const total = segments.reduce((a,s)=>a+s.value,0)||1;
  return (
    <svg width={size} height={size}>
      {segments.map((s,i) => {
        const dash = (s.value/total)*circ, gap = circ-dash;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
          strokeWidth={stroke} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
          strokeLinecap="round"
          style={{ transform:"rotate(-90deg)", transformOrigin:"center", transition:"stroke-dasharray 0.8s ease" }}/>;
        offset += dash; return el;
      })}
    </svg>
  );
}

// ── StatCard — stable, no animation on data change ──
function StatCard({ label, value, unit, color, icon, sub, mini }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:"white", borderRadius:16, padding:"20px",
      boxShadow: hov?`0 20px 50px rgba(0,0,0,0.1),0 0 0 2px ${color}30`:"0 2px 16px rgba(0,0,0,0.06)",
      transform: hov?"translateY(-4px)":"translateY(0)",
      transition:"box-shadow 0.3s ease, transform 0.3s ease",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute",top:-20,right:-20,width:70,height:70,borderRadius:"50%",
                    background:`${color}12`, transform:hov?"scale(1.6)":"scale(1)", transition:"transform 0.3s" }}/>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:8 }}>{label}</div>
          <div style={{ fontSize:30,fontWeight:800,color:"#1e293b",fontFamily:"'DM Mono',monospace",lineHeight:1 }}>
            {typeof value==="number" ? value.toFixed(value<10?2:1) : "--"}
            <span style={{ fontSize:13,fontWeight:500,color:"#94a3b8",marginLeft:4 }}>{unit}</span>
          </div>
          {sub && <div style={{ fontSize:11,color,marginTop:6,fontWeight:600 }}>{sub}</div>}
        </div>
        <div style={{ width:42,height:42,borderRadius:12,background:`${color}15`,
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{icon}</div>
      </div>
      {mini && <div style={{ marginTop:12 }}><MiniBar values={mini} color={color}/></div>}
    </div>
  );
}

function AlertRow({ label, value, color }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"11px 0",borderBottom:"1px solid #f1f5f9" }}>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}` }}/>
        <span style={{ fontSize:13,color:"#475569",fontWeight:500 }}>{label}</span>
      </div>
      <span style={{ fontSize:18,fontWeight:800,color:"#1e293b",fontFamily:"'DM Mono',monospace" }}>{value}</span>
    </div>
  );
}

const PAGES = [
  { icon:"⊞", label:"Dashboard" },
  { icon:"❤️", label:"Heart Rate" },
  { icon:"💧", label:"SpO₂" },
  { icon:"🌡️", label:"Temperature" },
  { icon:"🛡️", label:"Risk Score" },
  { icon:"🔔", label:"Alerts" },
  { icon:"🗺️", label:"GPS Map" },
];

// ── GPS Map component — only re-renders when coords change significantly ──
const GPSMap = ({ lat, lng }) => {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed&t=m`;
  return (
    <iframe title="GPS" width="100%" height="100%" style={{ border:0 }}
      loading="lazy" allowFullScreen src={src} />
  );
};

export default function Dashboard() {
  // ── All live data in ONE ref — no re-renders from data updates ──
  const liveRef   = useRef({ hr:72, spo2:98, temp:36.8, risk:0, status:"NORMAL",
                              fall:false, signal:26, lat:17.8687, lng:78.2322, tick:0 });
  const ecgRef    = useRef(Array(80).fill({v:0}));
  const hrRef     = useRef(Array(10).fill(72));
  const spo2Ref   = useRef(Array(10).fill(98));
  const tempRef   = useRef(Array(10).fill(36.8));
  const riskRef   = useRef(Array(10).fill(0));
  const alertsRef = useRef([]);
  const lastStRef = useRef("NORMAL");

  // ── Only these cause re-renders — updated sparingly ──
  const [display,  setDisplay]  = useState({ hr:72, spo2:98, temp:36.8, risk:0,
                                              status:"NORMAL", fall:false, signal:26,
                                              lat:17.8687, lng:78.2322, tick:0 });
  const [alerts,   setAlerts]   = useState([]);
  const [connected,setConnected]= useState(false);
  const [page,     setPage]     = useState(0);
  const [time,     setTime]     = useState("");
  const [hrHist,   setHrHist]   = useState(Array(10).fill(72));
  const [spo2Hist, setSpo2Hist] = useState(Array(10).fill(98));
  const [tempHist, setTempHist] = useState(Array(10).fill(36.8));
  const [riskHist, setRiskHist] = useState(Array(10).fill(0));

  // Clock — separate interval, never touches data
  useEffect(() => {
    const id = setInterval(()=>setTime(new Date().toLocaleTimeString()), 1000);
    return ()=>clearInterval(id);
  }, []);

  // ── Data fetch — updates refs immediately, setState only every 4s ──
  useEffect(() => {
    let renderCounter = 0;

    async function fetchData() {
      try {
        const res  = await fetch("/api/telemetry");
        const json = await res.json();
        setConnected(!json.simulated);

        // Update refs immediately (no re-render)
        liveRef.current = {
          hr:    json.heartRate   || 72,
          spo2:  json.spo2        || 98,
          temp:  json.temperature || 36.8,
          risk:  json.riskScore   || 0,
          status:json.workerStatus|| "NORMAL",
          fall:  json.fallDetected|| false,
          signal:json.signal      || 26,
          lat:   json.latitude    || 17.8687,
          lng:   json.longitude   || 78.2322,
          tick:  (liveRef.current.tick||0) + 1,
        };

        // ECG buffer update via ref only
        ecgRef.current = [...ecgRef.current, { v: nextECG(liveRef.current.hr) }].slice(-80);

        // History refs
        hrRef.current   = [...hrRef.current,   liveRef.current.hr  ].slice(-10);
        spo2Ref.current = [...spo2Ref.current,  liveRef.current.spo2].slice(-10);
        tempRef.current = [...tempRef.current,  liveRef.current.temp].slice(-10);
        riskRef.current = [...riskRef.current,  liveRef.current.risk].slice(-10);

        // Alert check via ref — no re-render unless new alert
        if (json.workerStatus !== lastStRef.current) {
          const t = new Date().toLocaleTimeString();
          const newAlert = {
            time:t, msg:json.workerStatus,
            type: json.workerStatus==="NORMAL"?"ok":json.riskScore>=60?"critical":"warn",
            hr:json.heartRate?.toFixed(1), spo2:json.spo2?.toFixed(1),
          };
          alertsRef.current = [newAlert, ...alertsRef.current].slice(0,15);
          lastStRef.current = json.workerStatus;
          setAlerts([...alertsRef.current]); // re-render only for new alert
        }

        // Re-render display only every 4 fetches (every 8 seconds) for stable data
        // BUT always re-render for status/fall changes
        renderCounter++;
        if (renderCounter >= 2 || json.workerStatus !== lastStRef.current) {
          renderCounter = 0;
          setDisplay({ ...liveRef.current });
          setHrHist([...hrRef.current]);
          setSpo2Hist([...spo2Ref.current]);
          setTempHist([...tempRef.current]);
          setRiskHist([...riskRef.current]);
        }

      } catch(e) { setConnected(false); }
    }

    fetchData();
    const id = setInterval(fetchData, 2000);
    return () => clearInterval(id);
  }, []); // empty deps — never recreated

  const d = display;
  const statusColor = d.status==="NORMAL"?"#22c55e":d.status==="WARNING"?"#f59e0b":"#ef4444";
  const donutSegs = [
    { value: Math.max(0,100-d.risk), color:"#6366f1" },
    { value: d.risk>0?Math.min(d.risk,40):0, color:"#f59e0b" },
    { value: d.risk>=60?d.risk-40:0, color:"#ef4444" },
  ];

  function PageContent() {
    if (page===0) return (
      <>
        {/* Row 1 */}
        <div style={{ display:"grid",gridTemplateColumns:"1.1fr 0.65fr 0.9fr 0.9fr",gap:16,marginBottom:16 }}>
          {/* Hero */}
          <div style={{
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            borderRadius:20,padding:"28px",
            boxShadow:"0 8px 32px rgba(99,102,241,0.3)",
            color:"white",position:"relative",overflow:"hidden",
          }}>
            <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",
                          background:"rgba(255,255,255,0.1)",animation:"float 4s ease-in-out infinite" }}/>
            <div style={{ position:"absolute",bottom:-20,right:20,width:80,height:80,borderRadius:"50%",
                          background:"rgba(255,255,255,0.06)",animation:"float 5s ease-in-out infinite 1s" }}/>
            <div style={{ fontSize:11,letterSpacing:2,opacity:0.7,marginBottom:8,textTransform:"uppercase",fontWeight:600 }}>Worker Health</div>
            <div style={{ fontSize:26,fontWeight:800,lineHeight:1.2,marginBottom:20 }}>Pulse Shield<br/>Digital Twin</div>
            <div style={{ display:"flex",gap:14,fontSize:12 }}>
              {[["Normal","#22c55e"],["Warning","#f59e0b"],["Critical","#ef4444"]].map(([l,c])=>(
                <div key={l} style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:c }}/>
                  <span style={{ opacity:0.85 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut */}
          <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)",
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>Risk Score</div>
            <div style={{ position:"relative" }}>
              <Donut segments={donutSegs} size={100} stroke={12}/>
              <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                <div style={{ fontSize:22,fontWeight:800,color:"#1e293b",fontFamily:"'DM Mono',monospace" }}>{d.risk}</div>
                <div style={{ fontSize:10,color:"#94a3b8" }}>/100</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:8,marginTop:10 }}>
              {[["Safe","#6366f1"],["Warn","#f59e0b"],["High","#ef4444"]].map(([l,c])=>(
                <div key={l} style={{ fontSize:10,color:"#64748b",display:"flex",alignItems:"center",gap:3 }}>
                  <div style={{ width:7,height:7,borderRadius:2,background:c }}/>{l}
                </div>
              ))}
            </div>
          </div>

          {/* Fall + Signal */}
          <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>Device Status</div>
            <AlertRow label="Fall Detection" value={d.fall?"YES":"No"} color={d.fall?"#ef4444":"#22c55e"}/>
            <AlertRow label="4G Signal" value={`${d.signal}/31`} color="#6366f1"/>
            <AlertRow label="Updates" value={`${d.tick}`} color="#8b5cf6"/>
          </div>

          {/* Latest alert */}
          <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>Latest Alert</div>
            {alerts.length===0
              ? <div style={{ fontSize:13,color:"#94a3b8",padding:"12px 0" }}>All nominal</div>
              : alerts.slice(0,3).map((a,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,
                    background:a.type==="ok"?"#22c55e":a.type==="critical"?"#ef4444":"#f59e0b" }}/>
                  <div>
                    <div style={{ fontSize:12,fontWeight:600,color:"#1e293b" }}>{a.msg}</div>
                    <div style={{ fontSize:10,color:"#94a3b8" }}>{a.time}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Row 2: stat cards */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:16 }}>
          <StatCard label="Heart Rate" value={d.hr} unit="bpm" color="#ef4444" icon="❤️"
            sub={d.hr>120?"⚠ HIGH":d.hr<50?"⚠ LOW":"Normal"} mini={hrHist}/>
          <StatCard label="SpO₂ Oxygen" value={d.spo2} unit="%" color="#3b82f6" icon="💧"
            sub={d.spo2<90?"⚠ CRITICAL":"Normal"} mini={spo2Hist}/>
          <StatCard label="Temperature" value={d.temp} unit="°C" color="#f59e0b" icon="🌡️"
            sub={d.temp>38.5?"⚠ FEVER":"Normal"} mini={tempHist}/>
          <StatCard label="ECG Signal" value={(d.hr/60).toFixed(2)} unit="Hz" color="#8b5cf6" icon="📡"
            sub="PQRST waveform" mini={hrHist.map(v=>v/2)}/>
        </div>

        {/* Row 3: ECG + Map side by side */}
        <div style={{ display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16 }}>
          {/* ECG */}
          <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:14,color:"#1e293b" }}>ECG Waveform</div>
                <div style={{ fontSize:11,color:"#94a3b8",marginTop:2 }}>AD8232 — Real-time PQRST</div>
              </div>
              <div style={{ padding:"4px 10px",borderRadius:999,background:"#eef2ff",color:"#6366f1",fontSize:11,fontWeight:700 }}>LIVE</div>
            </div>
            <ECGCanvas dataRef={ecgRef}/>
          </div>

          {/* Google Map on main dashboard */}
          <div style={{ background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ padding:"14px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontWeight:700,fontSize:14,color:"#1e293b" }}>GPS Location</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#94a3b8" }}>
                {d.lat.toFixed(4)}°N {d.lng.toFixed(4)}°E
              </div>
            </div>
            <div style={{ height:180 }}>
              <GPSMap lat={d.lat} lng={d.lng}/>
            </div>
          </div>
        </div>
      </>
    );

    if (page===1) return (
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:"#1e293b",marginBottom:20 }}>Heart Rate Monitor</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
          <StatCard label="Current HR" value={d.hr} unit="bpm" color="#ef4444" icon="❤️"
            sub={d.hr>120?"⚠ HIGH — above 120 bpm":d.hr<50?"⚠ LOW — below 50 bpm":"Normal range 60–100 bpm"} mini={hrHist}/>
          <div style={{ background:"white",borderRadius:16,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>History</div>
            <MiniBar values={hrHist} color="#ef4444"/>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:"#94a3b8" }}>
              <span>Min: {Math.min(...hrHist).toFixed(0)}</span>
              <span>Max: {Math.max(...hrHist).toFixed(0)}</span>
              <span>Avg: {(hrHist.reduce((a,b)=>a+b,0)/hrHist.length).toFixed(0)}</span>
            </div>
          </div>
        </div>
        <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight:700,fontSize:14,color:"#1e293b",marginBottom:14 }}>Live ECG Waveform</div>
          <ECGCanvas dataRef={ecgRef}/>
        </div>
      </div>
    );

    if (page===2) return (
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:"#1e293b",marginBottom:20 }}>SpO₂ Oxygen Monitor</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
          <StatCard label="SpO₂ Level" value={d.spo2} unit="%" color="#3b82f6" icon="💧"
            sub={d.spo2<90?"⚠ CRITICAL":d.spo2<95?"Low — below 95%":"Normal above 95%"} mini={spo2Hist}/>
          <div style={{ background:"white",borderRadius:16,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>SpO₂ Trend</div>
            <MiniBar values={spo2Hist} color="#3b82f6"/>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:"#94a3b8" }}>
              <span>Min: {Math.min(...spo2Hist).toFixed(1)}%</span>
              <span>Max: {Math.max(...spo2Hist).toFixed(1)}%</span>
            </div>
            <div style={{ marginTop:16,padding:"12px",borderRadius:10,
              background:d.spo2<90?"#fef2f2":"#f0fdf4",
              border:`1px solid ${d.spo2<90?"#fecaca":"#bbf7d0"}`,
              fontSize:13,color:d.spo2<90?"#dc2626":"#16a34a",fontWeight:600 }}>
              {d.spo2<90?"⚠ Emergency — low oxygen detected":"✓ Oxygen levels normal"}
            </div>
          </div>
        </div>
      </div>
    );

    if (page===3) return (
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:"#1e293b",marginBottom:20 }}>Temperature Monitor</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
          <StatCard label="Body Temperature" value={d.temp} unit="°C" color="#f59e0b" icon="🌡️"
            sub={d.temp>38.5?"⚠ FEVER — above 38.5°C":"Normal range 36.1–37.2°C"} mini={tempHist}/>
          <div style={{ background:"white",borderRadius:16,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>Temperature Trend</div>
            <MiniBar values={tempHist} color="#f59e0b"/>
            <div style={{ marginTop:16,padding:"12px",borderRadius:10,
              background:d.temp>38.5?"#fef2f2":"#f0fdf4",
              border:`1px solid ${d.temp>38.5?"#fecaca":"#bbf7d0"}`,
              fontSize:13,color:d.temp>38.5?"#dc2626":"#16a34a",fontWeight:600 }}>
              {d.temp>38.5?"⚠ Fever detected":"✓ Temperature normal"}
            </div>
          </div>
        </div>
      </div>
    );

    if (page===4) return (
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:"#1e293b",marginBottom:20 }}>Risk Score — Digital Twin</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16 }}>
          <div style={{ background:"white",borderRadius:20,padding:"24px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)",
                        display:"flex",flexDirection:"column",alignItems:"center" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:16 }}>Overall Risk</div>
            <div style={{ position:"relative" }}>
              <Donut segments={donutSegs} size={140} stroke={16}/>
              <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                <div style={{ fontSize:32,fontWeight:800,color:"#1e293b",fontFamily:"'DM Mono',monospace" }}>{d.risk}</div>
                <div style={{ fontSize:12,color:"#94a3b8" }}>/100</div>
              </div>
            </div>
            <div style={{ marginTop:14,fontSize:14,fontWeight:700,
              color:d.risk<30?"#16a34a":d.risk<60?"#d97706":"#dc2626" }}>
              {d.risk<30?"LOW RISK":d.risk<60?"MODERATE":"HIGH RISK"}
            </div>
          </div>
          <div style={{ background:"white",borderRadius:20,padding:"24px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:16 }}>Risk Breakdown</div>
            {[
              {label:"Fall Detected",score:d.fall?40:0,max:40,color:"#ef4444"},
              {label:"Heart Rate",score:d.hr>120?25:d.hr<50?25:0,max:25,color:"#f97316"},
              {label:"SpO₂ Level",score:d.spo2<90?30:0,max:30,color:"#3b82f6"},
              {label:"Temperature",score:d.temp>38.5?20:0,max:20,color:"#f59e0b"},
            ].map((r,i)=>(
              <div key={i} style={{ marginBottom:14 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4 }}>
                  <span style={{ color:"#475569",fontWeight:500 }}>{r.label}</span>
                  <span style={{ color:"#1e293b",fontWeight:700,fontFamily:"'DM Mono',monospace" }}>{r.score}/{r.max}</span>
                </div>
                <div style={{ height:6,borderRadius:3,background:"#f1f5f9" }}>
                  <div style={{ height:"100%",borderRadius:3,background:r.color,
                                width:`${(r.score/r.max)*100}%`,transition:"width 0.8s ease" }}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:"white",borderRadius:20,padding:"24px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>Risk History</div>
            <MiniBar values={riskHist} color="#6366f1"/>
            <div style={{ marginTop:16,padding:12,borderRadius:10,
              background:d.risk>=60?"#fef2f2":d.risk>=30?"#fefce8":"#f0fdf4",
              border:`1px solid ${d.risk>=60?"#fecaca":d.risk>=30?"#fde68a":"#bbf7d0"}`,
              fontSize:13,fontWeight:600,color:d.risk>=60?"#dc2626":d.risk>=30?"#d97706":"#16a34a" }}>
              {d.risk>=60?"⚠ Critical — immediate action needed":d.risk>=30?"⚠ Warning — monitor closely":"✓ Safe — all readings normal"}
            </div>
          </div>
        </div>
      </div>
    );

    if (page===5) return (
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:"#1e293b",marginBottom:20 }}>Alert Log — Rule Engine</div>
        <div style={{ background:"white",borderRadius:20,padding:"24px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
          {alerts.length===0
            ? <div style={{ textAlign:"center",padding:"48px 0",color:"#94a3b8",fontSize:15 }}>No alerts — system nominal</div>
            : <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {alerts.map((a,i)=>(
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,
                    background:a.type==="ok"?"#f0fdf4":a.type==="critical"?"#fef2f2":"#fefce8",
                    border:`1px solid ${a.type==="ok"?"#bbf7d0":a.type==="critical"?"#fecaca":"#fde68a"}`,
                  }}>
                    <div style={{ width:12,height:12,borderRadius:"50%",flexShrink:0,
                      background:a.type==="ok"?"#22c55e":a.type==="critical"?"#ef4444":"#f59e0b" }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:"#1e293b" }}>{a.msg}</div>
                      <div style={{ fontSize:12,color:"#94a3b8",marginTop:3 }}>{a.time} · HR:{a.hr} bpm · SpO₂:{a.spo2}%</div>
                    </div>
                    <div style={{ fontSize:11,padding:"4px 10px",borderRadius:999,fontWeight:600,
                      background:a.type==="ok"?"#dcfce7":a.type==="critical"?"#fee2e2":"#fef9c3",
                      color:a.type==="ok"?"#16a34a":a.type==="critical"?"#dc2626":"#d97706" }}>
                      {a.type==="ok"?"RESOLVED":a.type==="critical"?"CRITICAL":"WARNING"}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    );

    if (page===6) return (
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:"#1e293b",marginBottom:20 }}>GPS Location — SIM7600EI GNSS</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 280px",gap:16 }}>
          <div style={{ background:"white",borderRadius:20,overflow:"hidden",
                        boxShadow:"0 2px 16px rgba(0,0,0,0.06)",height:500 }}>
            <GPSMap lat={d.lat} lng={d.lng}/>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>Coordinates</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color:"#1e293b",lineHeight:2.2 }}>
                <div>LAT: {d.lat.toFixed(6)}°N</div>
                <div>LNG: {d.lng.toFixed(6)}°E</div>
              </div>
            </div>
            <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize:10,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:12 }}>Location</div>
              <div style={{ fontSize:13,color:"#475569",lineHeight:2 }}>
                <div style={{ fontWeight:700,color:"#1e293b" }}>BVRIT Campus</div>
                <div>Vishnupur, Narsapur</div>
                <div>Medak, Telangana 502313</div>
              </div>
            </div>
            <div style={{ background:"white",borderRadius:20,padding:"20px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
              <AlertRow label="Module" value="SIM7600EI" color="#6366f1"/>
              <AlertRow label="Signal" value={`${d.signal}/31`} color="#22c55e"/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pulse Shield — Digital Twin</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#f8fafc;color:#1e293b;font-family:'DM Sans',sans-serif;min-height:100vh}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px}
      `}</style>

      <div style={{ display:"flex",minHeight:"100vh" }}>
        {/* SIDEBAR */}
        <div style={{ width:72,background:"white",display:"flex",flexDirection:"column",
                      alignItems:"center",padding:"20px 0",
                      borderRight:"1px solid #f1f5f9",
                      boxShadow:"4px 0 20px rgba(0,0,0,0.04)",
                      position:"sticky",top:0,height:"100vh",zIndex:10,flexShrink:0 }}>
          <div style={{ width:44,height:44,borderRadius:14,background:"#6366f1",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        marginBottom:28,boxShadow:"0 4px 16px rgba(99,102,241,0.4)",
                        animation:"float 3s ease-in-out infinite" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          {PAGES.map((p,i)=>(
            <div key={i} title={p.label} onClick={()=>setPage(i)} style={{
              width:44,height:44,borderRadius:12,display:"flex",alignItems:"center",
              justifyContent:"center",cursor:"pointer",marginBottom:6,fontSize:18,
              background:page===i?"#6366f1":"transparent",
              boxShadow:page===i?"0 4px 16px rgba(99,102,241,0.4)":"none",
              color:page===i?"white":"#94a3b8",
              transition:"background 0.2s ease, box-shadow 0.2s ease",
            }}>{p.icon}</div>
          ))}
        </div>

        {/* MAIN */}
        <div style={{ flex:1,overflow:"auto" }}>
          {/* Top bar */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
                        padding:"14px 28px",background:"white",
                        borderBottom:"1px solid #f1f5f9",
                        position:"sticky",top:0,zIndex:9,
                        boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div>
              <div style={{ fontSize:20,fontWeight:800,color:"#1e293b" }}>{PAGES[page].label}</div>
              <div style={{ fontSize:11,color:"#94a3b8",marginTop:1 }}>{time}</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",
                            background:connected?"#f0fdf4":"#fefce8",
                            border:`1px solid ${connected?"#bbf7d0":"#fde68a"}`,
                            borderRadius:999,fontSize:12,fontWeight:600,
                            color:connected?"#16a34a":"#d97706" }}>
                <span style={{ width:7,height:7,borderRadius:"50%",display:"inline-block",
                  background:connected?"#22c55e":"#f59e0b",animation:"pulse 1s infinite" }}/>
                {connected?"ThingsBoard Live":"Simulated"}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",
                            background:`${statusColor}10`,border:`1px solid ${statusColor}40`,
                            borderRadius:999,fontSize:12,fontWeight:700,color:statusColor }}>
                <span style={{ width:7,height:7,borderRadius:"50%",display:"inline-block",
                  background:statusColor,animation:d.status!=="NORMAL"?"pulse 0.6s infinite":"none" }}/>
                {d.status}
              </div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ padding:"24px 28px" }}>
            <PageContent/>
          </div>

          <div style={{ textAlign:"center",padding:16,color:"#cbd5e1",fontSize:11,borderTop:"1px solid #f1f5f9" }}>
            Pulse Shield Digital Twin · BVRIT ECE · Industry 4.0 · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}
