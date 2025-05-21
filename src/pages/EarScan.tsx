import React, { useEffect, useState } from "react";

const EarScan: React.FC = () => {
  const [impedance, setImpedance] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState("30s");

  const BACKEND_BASE_URL = "https://impedance-backend.onrender.com";

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
      startImpedanceStream();
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  const startImpedanceStream = () => {
    const source = new EventSource(`${BACKEND_BASE_URL}/stream-impedance`);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const value = parsed.impedance?.value || parsed.impedance;
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
      const res = await fetch(`${BACKEND_BASE_URL}/start-eeg-stream`);
      const data = await res.json();
      console.log("🎬 EEG Recording:", data);
      alert(data.status || "Recording started");
    } catch (err) {
      console.error("Failed to start EEG stream:", err);
      alert("Failed to start EEG stream");
    }
  };

  const stopAndSaveEEG = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/stop-and-save-eeg`);
      if (!response.ok) throw new Error("Request failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "eeg_data.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setRecording(false);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download EEG data");
    }
  };

  return (
    <div className="earscan" style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Ear Signals</h2>
      <p>Scan your brain waves with Ear device</p>

      <h3>Bluetooth Status</h3>
      <p>
        Status:{" "}
        <span style={{ color: connected ? "green" : "red" }}>
          {connected ? "Connected ✅" : "Disconnected ❌"}
        </span>
      </p>

      <button
        onClick={connectToDevice}
        style={{
          backgroundColor: "green",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px",
          marginBottom: "10px"
        }}
      >
        {connected ? "Reconnect" : "Connect"}
      </button>

      {impedance !== null && (
        <p style={{ marginTop: "1rem", color: impedance < 200 ? "green" : "red" }}>
          Impedance: <strong>{impedance.toFixed(2)} kΩ</strong>
        </p>
      )}

      <div style={{ marginTop: "1rem" }}>
        <label>Duration (e.g., 30s or 1m): </label>
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          style={{ padding: "4px", width: "80px", marginLeft: "8px" }}
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

      <button
        onClick={stopAndSaveEEG}
        style={{
          marginTop: "1rem",
          marginLeft: "10px",
          backgroundColor: "#e63946",
          color: "white",
          padding: "10px 16px",
          borderRadius: "8px"
        }}
      >
        Stop & Download EEG
      </button>
    </div>
  );
};

export default EarScan;
