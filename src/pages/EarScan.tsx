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

const EEG_SERVICE = "beffd56c-c915-48f5-930d-4c1feee0fcc3"; // Adjust if you get real UUID
const EarScan = () => {
  const [connected, setConnected] = useState(false);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [impedanceData, setImpedanceData] = useState<number[]>([]);
  const [duration, setDuration] = useState("30s");
  const [isRecording, setIsRecording] = useState(false);

  const impedanceChar = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const eegChar = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const eegData = useRef<{ timestamp: number; value: number }[]>([]);
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

      // Log all UUIDs to browser console
      characteristics.forEach((c) => console.log("Characteristic UUID:", c.uuid));

      impedanceChar.current = characteristics[0];
      eegChar.current = characteristics[1] || characteristics[0];

      await impedanceChar.current.startNotifications();
      impedanceChar.current.addEventListener("characteristicvaluechanged", handleImpedance);

      setConnected(true);
    } catch (error) {
      console.error("Connection failed:", error);
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

  const handleEEGData = (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const value = val.getUint8(0); // or getFloat32(0, true) depending on data format
    eegData.current.push({ timestamp: Date.now(), value });
  };

  const startRecording = async () => {
    if (!eegChar.current) return;
    eegData.current = [];
    setIsRecording(true);
    await eegChar.current.startNotifications();
    eegChar.current.addEventListener("characteristicvaluechanged", handleEEGData);
  };

  const stopAndSaveEEG = () => {
    if (!eegChar.current) return;
    eegChar.current.removeEventListener("characteristicvaluechanged", handleEEGData);
    setIsRecording(false);

    const csv =
      "data:text/csv;charset=utf-8,Timestamp,Value\n" +
      eegData.current.map(({ timestamp, value }) => `${new Date(timestamp).toISOString()},${value}`).join("\n");

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
        borderColor: "#00acc1",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  useEffect(() => {
    if (connected && impedanceChar.current) {
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = setInterval(async () => {
        try {
          const val = await impedanceChar.current!.readValue();
          const imp = val.getUint16(0, true);
          setImpedance(imp);
          setImpedanceData((prev) => [...prev.slice(-50), imp]);
        } catch (e) {
          console.warn("Polling failed", e);
        }
      }, 1000);
    }
    return () => pollInterval.current && clearInterval(pollInterval.current);
  }, [connected]);

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>Ear Signals</h2>
      <p>Connect your IDUN device to stream impedance & EEG</p>

      <p>
        Status:{" "}
        <strong style={{ color: connected ? "green" : "red" }}>
          {connected ? "Connected ✅" : "Disconnected ❌"}
        </strong>
      </p>

      <button onClick={connectToDevice} style={{ backgroundColor: "green", color: "white", padding: "10px 20px", borderRadius: 5 }}>
        Connect to IGEB
      </button>

      {impedance !== null && (
        <>
          <p style={{ marginTop: "1rem", fontSize: "1.5rem" }}>
            Impedance: {(impedance / 1000).toFixed(2)} kΩ | Quality: {impedanceQuality(impedance)}
          </p>
          <div style={{ width: "80%", margin: "auto" }}>
            <Line data={impedanceChartData} />
          </div>
        </>
      )}

      <div style={{ marginTop: "1rem" }}>
        <label>Duration (e.g. 30s): </label>
        <input value={duration} onChange={(e) => setDuration(e.target.value)} style={{ padding: "5px", width: "80px", marginLeft: "8px" }} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={startRecording} disabled={!connected || isRecording} style={{ backgroundColor: "blue", color: "white", padding: "10px 20px" }}>
          Start Recording
        </button>
        <button onClick={stopAndSaveEEG} disabled={!isRecording} style={{ backgroundColor: "crimson", color: "white", padding: "10px 20px", marginLeft: "1rem" }}>
          Stop & Download EEG
        </button>
      </div>
    </div>
  );
};

export default EarScan;
