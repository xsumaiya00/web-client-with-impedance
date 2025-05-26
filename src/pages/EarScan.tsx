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

// ✅ Use actual detected service UUID
const EEG_SERVICE = "beffd56c-c915-48f5-930d-4c1feee0fcc3";

const EarScan = () => {
  const [connected, setConnected] = useState(false);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [impedanceData, setImpedanceData] = useState<number[]>([]);
  const [duration, setDuration] = useState("30s");
  const [isRecording, setIsRecording] = useState(false);
  const eegData = useRef<{ timestamp: number; value: number }[]>([]);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

const connectToDevice = async () => {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: "IGEB" }],
      optionalServices: [EEG_SERVICE],
    });

    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(EEG_SERVICE);
    const characteristics = await service.getCharacteristics();
    console.log("Discovered characteristics:", characteristics);

    const char = characteristics[0];
    characteristicRef.current = char;
    await char.startNotifications();

    char.removeEventListener("characteristicvaluechanged", handleImpedance); // avoid duplicates
    char.addEventListener("characteristicvaluechanged", handleImpedance);
    setConnected(true);
  } catch (error) {
    console.error("Connection failed:", error);
  }
};


  const handleImpedance = (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const value = val.getUint16(0, true); // Or try getUint8/getFloat32 if needed
    setImpedance(value);
    setImpedanceData((prev) => [...prev.slice(-50), value]);
  };

  const startRecording = () => {
    if (!characteristicRef.current) return;
    eegData.current = [];
    setIsRecording(true);
    characteristicRef.current.addEventListener("characteristicvaluechanged", handleEEGData);
  };

  const handleEEGData = (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const value = val.getUint8(0);
    eegData.current.push({ timestamp: Date.now(), value });
  };

  const stopAndSaveEEG = () => {
    if (!characteristicRef.current) return;
    characteristicRef.current.removeEventListener("characteristicvaluechanged", handleEEGData);
    setIsRecording(false);

    const csv = "data:text/csv;charset=utf-8,Timestamp,Value\n" +
      eegData.current.map(({ timestamp, value }) =>
        `${new Date(timestamp).toISOString()},${value}`).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eeg_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const impedanceQuality = (val: number | null) => {
    if (val == null) return "N/A";
    if (val < 50) return "Excellent";
    if (val < 200) return "Good";
    return "Insufficient";
  };

  const impedanceChartData = {
    labels: impedanceData.map((_, i) => i.toString()),
    datasets: [
      {
        label: "Impedance (kΩ)",
        data: impedanceData.map((v) => (v / 1000).toFixed(2)),
        borderColor: "#4caf50",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  useEffect(() => {
    if (connected && characteristicRef.current) {
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = setInterval(async () => {
        try {
          const val = await characteristicRef.current!.readValue();
          const impedanceValue = val.getUint16(0, true);
          setImpedance(impedanceValue);
          setImpedanceData((prev) => [...prev.slice(-50), impedanceValue]);
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
      <p>Connect your IDUN device to stream impedance & EEG</p>

      <p>Status: <strong style={{ color: connected ? "green" : "red" }}>{connected ? "Connected ✅" : "Disconnected ❌"}</strong></p>
      <button onClick={connectToDevice} style={{ padding: "10px", backgroundColor: "green", color: "white", borderRadius: "5px" }}>
        Connect to IGEB
      </button>

      {impedance !== null && (
        <div style={{
          marginTop: "1rem", padding: "1rem", backgroundColor: "#111", color: "#fff",
          borderRadius: "8px", maxWidth: "500px", marginLeft: "auto", marginRight: "auto"
        }}>
          <p style={{ fontSize: "1.5rem" }}>Impedance: <strong>{(impedance / 1000).toFixed(2)} kΩ</strong></p>
          <p>Quality: <strong>{impedanceQuality(impedance)}</strong></p>
        </div>
      )}

      <div style={{ marginTop: "2rem", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
        <Line data={impedanceChartData} />
      </div>

      <div style={{ marginTop: "2rem" }}>
        <label>Duration: </label>
        <input value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: "80px", padding: "5px" }} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={startRecording} disabled={!connected || isRecording}
          style={{ backgroundColor: "blue", color: "white", padding: "10px 20px", marginRight: "10px" }}>
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
