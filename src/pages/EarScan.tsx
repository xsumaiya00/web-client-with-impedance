import React, { useEffect, useState } from "react";

const EarScan: React.FC = () => {
  const [impedance, setImpedance] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState("30s");

  // Enable recording if impedance < 200
  useEffect(() => {
    if (impedance !== null && impedance < 200) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [impedance]);

  const connectToDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "IGEB" }],
        optionalServices: ["battery_service"]
      });

      const server = await device.gatt?.connect();
      setConnected(true);

      // ✅ Start real impedance stream from backend
      startImpedanceStream();
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  const startImpedanceStream = () => {
    const source = new EventSource("http://localhost:8000/stream-impedance");

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const value = parsed.impedance?.value || parsed.impedance; // Adjust as needed
        if (typeof value === "number") {
          setImpedance(value);
        }
      } catch (err) {
        console.error("Invalid impedance data:", err);
      }
    };

    source.onerror = (err) => {
      console.error("Impedance stream error:", err);
      source.close();
    };
  };

  const startRecording = async () => {
    if (!isReady) return;
    setRecording(true);

    try {
      const res = await fetch("http://localhost:8000/start-eeg-stream");
      const data = await res.json();
      console.log("🎬 EEG Recording:", data);
      alert(data.status);
    } catch (err) {
      console.error("Failed to start EEG stream:", err);
    }
  };

  return (
    <div className="earscan" style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Ear Signals</h2>
      <p>Scan your brain waves with Ear device</p>

      <p>Status: {connected ? "Connected ✅" : "Disconnected ❌"}</p>
      <button onClick={connectToDevice} style={{ backgroundColor: "green", color: "white" }}>
        {connected ? "Reconnect" : "Connect"}
      </button>

      {impedance !== null && (
        <p style={{ color: impedance < 200 ? "green" : "red" }}>
          Impedance: <strong>{impedance} kΩ</strong>
        </p>
      )}

      <div style={{ marginTop: "1rem" }}>
        <label>Duration: </label>
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          style={{ padding: "4px", width: "80px" }}
        />
      </div>

      <button
        onClick={startRecording}
        disabled={!isReady}
        style={{
          marginTop: "1rem",
          backgroundColor: isReady ? "blue" : "gray",
          color: "white",
          padding: "10px 16px",
          borderRadius: "8px"
        }}
      >
        Start Recording
      </button>
    </div>
  );
};

export default EarScan;
