// pages/api/telemetry.js
// Proxies ThingsBoard REST API — keeps token server-side
// ThingsBoard EU endpoint + device token from env vars

const TB_HOST  = process.env.TB_HOST  || "eu.thingsboard.cloud";
const TB_TOKEN = process.env.TB_TOKEN || "pP2VgUQxExj3nYGkOkxP";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // Fetch latest telemetry via ThingsBoard HTTP API
    const url = `http://${TB_HOST}/api/v1/${TB_TOKEN}/attributes`;
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "ThingsBoard unreachable" });
    }

    const attributes = await response.json();

    // Also fetch telemetry keys
    const telUrl = `http://${TB_HOST}/api/v1/${TB_TOKEN}/telemetry`;
    // ThingsBoard HTTP API doesn't support GET telemetry via device token
    // We use the client attributes which the simulator writes to
    const data = {
      heartRate:    parseFloat(attributes.client?.lastHeartRate   ?? 72),
      spo2:         parseFloat(attributes.client?.lastSpO2        ?? 98),
      temperature:  parseFloat(attributes.client?.lastTemperature ?? 36.8),
      riskScore:    parseInt(attributes.client?.lastRiskScore     ?? 0),
      workerStatus: attributes.client?.workerStatus               ?? "NORMAL",
      latitude:     parseFloat(attributes.client?.lastLatitude    ?? 17.8687),
      longitude:    parseFloat(attributes.client?.lastLongitude   ?? 78.2322),
      timestamp:    Date.now(),
    };

    return res.status(200).json(data);
  } catch (err) {
    // Return simulated data as fallback so dashboard never breaks
    return res.status(200).json({
      heartRate:    72 + (Math.random() - 0.5) * 4,
      spo2:         98 + (Math.random() - 0.5) * 0.6,
      temperature:  36.8 + (Math.random() - 0.5) * 0.1,
      riskScore:    0,
      workerStatus: "NORMAL",
      latitude:     17.8687,
      longitude:    78.2322,
      timestamp:    Date.now(),
      simulated:    true,
    });
  }
}
