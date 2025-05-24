// EarScan.tsx
import React, { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

const EEG_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb";
const EEG_CHAR = "00002a19-0000-1000-8000-00805f9b34fb"; // Use real EEG UUID if different

const EarScan = () => {
  const [connected, setConnected] = useState(false);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [impedanceData, setImpedanceData] = useState<number[]>([]);
  const [duration, setDuration] = useState("30s");
  const [isRecording, setIsRecording] = useState(false);
  const eegData = useRef<{ timestamp: number; value: number }[]>([]);
  const eegChar = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const connectToDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [EEG_SERVICE] }],
        optionalServices: [EEG_SERVICE],
      });
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(EEG_SERVICE);
      const char = await service.getCharacteristic(EEG_CHAR);

      eegChar.current = char;
      setConnected(true);
    } catch (error) {
      console.error("Bluetooth connection failed:", error);
    }
  };

  const startRecording = () => {
    if (!eegChar.current) return;
    eegData.current = [];
    setIsRecording(true);
    eegChar.current.addEventListener("characteristicvaluechanged", handleEEGData);
    eegChar.current.startNotifications();
  };

  const stopAndSaveEEG = () => {
    if (!eegChar.current) return;
    eegChar.current.removeEventListener("characteristicvaluechanged", handleEEGData);
    setIsRecording(false);

    const csvContent = "data:text/csv;charset=utf-8,Timestamp,Value\n" +
      eegData.current.map(({ timestamp, value }) =>
        `${new Date(timestamp).toISOString()},${value}`).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eeg_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEEGData = (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const eegVal = val.getUint8(0);
    eegData.current.push({ timestamp: Date.now(), value: eegVal });
  };

  const impedanceQuality = (value: number | null) => {
    if (value === null) return "N/A";
    if (value < 50) return "Excellent";
    if (value < 200) return "Good";
    return "Insufficient";
  };

  const impedanceChartData = {
    labels: impedanceData.map((_, i) => i.toString()),
    datasets: [{
      label: "Impedance (kΩ)",
      data: impedanceData.map(v => (v / 1000).toFixed(2)),
      fill: false,
      borderColor: "#00acc1",
      tension: 0.3,
    }]
  };

  useEffect(() => {
    if (connected && eegChar.current) {
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = setInterval(async () => {
        try {
          const val = await eegChar.current!.readValue();
          const impedanceValue = val.getUint16(0, true);
          setImpedance(impedanceValue);
          setImpedanceData(prev => [...prev.slice(-50), impedanceValue]);
        } catch (e) {
          console.warn("Polling failed", e);
        }
      }, 1000);
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [connected]);

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>Ear Signals</h2>
      <p>Scan your brain waves with Ear device</p>

      <h3>Bluetooth Status</h3>
      <p>Status: <span style={{ color: connected ? "green" : "red" }}>{connected ? "Connected ✅" : "Disconnected ❌"}</span></p>
      <button onClick={connectToDevice} style={{ backgroundColor: "green", color: "white", padding: "10px", marginBottom: "1rem" }}>
        {connected ? "Reconnect" : "Connect"}
      </button>

      {impedance !== null && (
        <div style={{
          background: "#0e1d2f",
          borderRadius: "10px",
          color: "#fff",
          margin: "1rem auto",
          padding: "1rem",
          width: "90%",
          maxWidth: "500px"
        }}>
          <h3 style={{ color: "#ccc" }}>Live Impedance</h3>
          <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#00e676" }}>
            {(impedance / 1000).toFixed(2)} kΩ
          </p>
          <p style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            color:
              impedanceQuality(impedance) === "Excellent" ? "#4caf50" :
                impedanceQuality(impedance) === "Good" ? "#ff9800" :
                  "#f44336"
          }}>
            Quality: {impedanceQuality(impedance)}
          </p>
        </div>
      )}

      <div style={{ width: "90%", maxWidth: "600px", margin: "2rem auto" }}>
        <Line data={impedanceChartData} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label>Duration (e.g., 30s or 1m): </label>
        <input
          value={duration}
          onChange={e => setDuration(e.target.value)}
          style={{ width: "80px", padding: "4px", marginLeft: "8px" }}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={startRecording} disabled={!connected || isRecording}
          style={{ backgroundColor: "blue", color: "white", padding: "10px 20px", marginRight: "1rem" }}>
          Start Recording
        </button>
        <button onClick={stopAndSaveEEG} disabled={!isRecording}
          style={{ backgroundColor: "crimson", color: "white", padding: "10px 20px" }}>
          Stop & Download EEG
        </button>
      </div>
    </div>
  );
};

export default EarScan;
