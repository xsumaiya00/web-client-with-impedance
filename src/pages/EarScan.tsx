// Updated EarScan.tsx

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

const EarScan = () => {
  const [connected, setConnected] = useState(false);
  const [impedanceData, setImpedanceData] = useState<number[]>([]);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [duration, setDuration] = useState("30s");
  const [isRecording, setIsRecording] = useState(false);
  const eegData = useRef<{ timestamp: number; value: number }[]>([]);
  const eegChar = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connectToIGEB = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "IGEB" }],
        optionalServices: ["battery_service"] // allows fetching characteristics
      });

      const server = await device.gatt!.connect();
      const services = await server.getPrimaryServices();

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const c of characteristics) {
          console.log("Characteristic UUID:", c.uuid);
          const props = c.properties;
          if (props.notify) {
            eegChar.current = c;
            await c.startNotifications();
            c.addEventListener("characteristicvaluechanged", handleImpedance);
            setConnected(true);
            return;
          }
        }
      }

      console.error("No notifiable characteristic found.");
      alert("No streamable characteristic found.");
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const handleImpedance = (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const value = val.getUint16(0, true);
    setImpedance(value);
    setImpedanceData((prev) => [...prev.slice(-50), value]);
    if (isRecording) {
      eegData.current.push({ timestamp: Date.now(), value });
    }
  };

  const startRecording = () => {
    if (!connected || !eegChar.current) return;
    setIsRecording(true);
    eegData.current = [];
  };

  const stopAndDownload = () => {
    setIsRecording(false);
    const csv = "Timestamp,Value\n" + eegData.current.map(d => `${new Date(d.timestamp).toISOString()},${d.value}`).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `eeg_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const impedanceQuality = (val: number | null) => {
    if (val === null) return "N/A";
    if (val < 50) return "Excellent";
    if (val < 200) return "Good";
    return "Poor";
  };

  const chartData = {
    labels: impedanceData.map((_, i) => i.toString()),
    datasets: [{
      label: "Impedance (kΩ)",
      data: impedanceData.map((v) => (v / 1000).toFixed(2)),
      fill: false,
      borderColor: "#4bc0c0",
      tension: 0.4
    }]
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>Ear Signals</h2>
      <p>Connect your IDUN device to stream impedance & EEG</p>
      <p>Status: <span style={{ color: connected ? "green" : "red" }}>{connected ? "Connected ✅" : "Disconnected ❌"}</span></p>
      <button onClick={connectToIGEB} style={{ backgroundColor: "green", color: "white", padding: "10px 20px", marginBottom: "20px" }}>
        Connect to IGEB
      </button>

      {impedance !== null && (
        <>
          <p>Impedance: <strong>{(impedance / 1000).toFixed(2)} kΩ</strong> — Quality: <strong>{impedanceQuality(impedance)}</strong></p>
          <div style={{ width: "80%", margin: "0 auto" }}>
            <Line data={chartData} />
          </div>
        </>
      )}

      <div style={{ marginTop: "1rem" }}>
        <label>Duration: </label>
        <input value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: "60px", padding: "5px" }} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={startRecording} disabled={!connected || isRecording} style={{ backgroundColor: "blue", color: "white", padding: "10px 20px" }}>
          Start Recording
        </button>
        <button onClick={stopAndDownload} disabled={!isRecording} style={{ backgroundColor: "crimson", color: "white", padding: "10px 20px", marginLeft: "1rem" }}>
          Stop & Download EEG
        </button>
      </div>
    </div>
  );
};

export default EarScan;
