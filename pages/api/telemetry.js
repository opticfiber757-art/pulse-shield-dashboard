// pages/api/telemetry.js
// Proxies ThingsBoard REST API — keeps token server-side

const TB_HOST  = process.env.TB_HOST  || "eu.thingsboard.cloud";
const TB_TOKEN = process.env.TB_TOKEN || "pP2VgUQxExj3nYGkOkxP";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const attrUrl  = `http://${TB_HOST}/api/v1/${TB_TOKEN}/attributes`;
    const attrResp = await fetch(attrUrl, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!attrResp.ok) {
      return res.status(502).json({ error: "ThingsBoard unreachable" });
    }

    const attributes = await attrResp.json();
    const c = attributes.client ?? {};

    return res.status(200).json({
      heartRate:    parseFloat(c.lastHeartRate   ?? 72),
      spo2:         parseFloat(c.lastSpO2        ?? 98),
      temperature:  parseFloat(c.lastTemperature ?? 36.8),
      riskScore:    parseInt  (c.lastRiskScore   ?? 0),
      workerStatus: c.workerStatus               ?? "NORMAL",
      gsr:          parseFloat(c.lastGsr         ?? 45),
      respRate:     parseFloat(c.lastRespRate    ?? 16),
      fallDetected: c.lastFall === "true" || c.lastFall === true,
      faultInjected:c.faultInjected              ?? "NONE",
      latitude:     parseFloat(c.lastLatitude    ?? 17.8687),
      longitude:    parseFloat(c.lastLongitude   ?? 78.2322),
      timestamp:    Date.now(),
    });
  } catch (err) {
    return res.status(200).json({
      heartRate:    72   + (Math.random() - 0.5) * 4,
      spo2:         98   + (Math.random() - 0.5) * 0.6,
      temperature:  36.8 + (Math.random() - 0.5) * 0.1,
      gsr:          45   + (Math.random() - 0.5) * 5,
      respRate:     16   + (Math.random() - 0.5) * 2,
      riskScore:    0,
      workerStatus: "NORMAL",
      fallDetected: false,
      faultInjected:"NONE",
      latitude:     17.8687,
      longitude:    78.2322,
      timestamp:    Date.now(),
      simulated:    true,
    });
  }
}
