import React, { useEffect, useState, useRef } from "react";

const BluetoothService = () => {
  const [connected, setConnected] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState("20s");

  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);
  const recordingData = useRef<string[]>([]);

  const connectBluetooth = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "IGEB" }],
        optionalServices: ["battery_service"],
      });

      setConnected(true);

      const server = await device.gatt?.connect();
      const batteryService = await server?.getPrimaryService("battery_service");
      const batteryLevelChar = await batteryService?.getCharacteristic("battery_level");
      const batteryValue = await batteryLevelChar?.readValue();
      const batteryPercent = batteryValue?.getUint8(0);

      if (batteryPercent !== undefined) setBattery(batteryPercent);

      simulateImpedanceStreaming();
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      setConnected(false);
    }
  };

  const simulateImpedanceStreaming = () => {
    const interval = setInterval(() => {
      const value = parseFloat((Math.random() * 2000 + 500).toFixed(2));
      setImpedance(value);
    }, 1000);

    return () => clearInterval(interval);
  };

  const parseDuration = (text: string): number => {
    const match = text.match(/^(\d+)(s|m)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    return unit === "m" ? value * 60 : value;
  };

  const startRecording = () => {
    const totalSeconds = parseDuration(duration);
    if (!totalSeconds) {
      alert("Invalid duration. Use formats like 10s or 1m.");
      return;
    }

    setRecording(true);
    recordingData.current = [];

    recordingInterval.current = setInterval(() => {
      const time = new Date().toLocaleTimeString();
      recordingData.current.push(`${time} - Impedance: ${impedance?.toFixed(2)} kΩ`);
    }, 1000);

    recordingTimeout.current = setTimeout(() => {
      stopRecording();
    }, totalSeconds * 1000);
  };

  const stopRecording = () => {
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
    setRecording(false);

    const blob = new Blob([recordingData.current.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `impedance_recording_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Bluetooth Status</h2>
      <p>
        Status:{" "}
        <span style={{ color: connected ? "green" : "red" }}>
          {connected ? "Connected ✅" : "Disconnected ❌"}
        </span>
      </p>
      <button
        style={{ backgroundColor: "green", color: "white", padding: "10px 20px" }}
        onClick={connectBluetooth}
      >
        {connected ? "Reconnect" : "Connect Bluetooth"}
      </button>

      {connected && (
        <>
          <p style={{ marginTop: "20px" }}>
            Battery: <strong>{battery !== null ? `${battery}%` : "Loading..."}</strong>
          </p>
          <p>
            Impedance:{" "}
            <strong>
              {impedance !== null ? `${impedance.toFixed(2)} kΩ` : "Fetching..."}
            </strong>
          </p>

          <div style={{ marginTop: "20px" }}>
            <label>
              Duration (e.g., 30s or 1m):{" "}
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{ width: "80px", marginRight: "10px" }}
              />
            </label>
            <br />
            {!recording ? (
              <button
                onClick={startRecording}
                style={{
                  marginTop: "10px",
                  padding: "10px 20px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  marginTop: "10px",
                  padding: "10px 20px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Stop & Save Recording
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BluetoothService;
