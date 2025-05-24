// EarScan.tsx
import React, { useEffect, useState, useRef } from "react";

const EEG_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb";
const EEG_CHAR = "00002a19-0000-1000-8000-00805f9b34fb"; // Same for impedance and EEG (assumed)

const EarScan = () => {
  const [connected, setConnected] = useState(false);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [duration, setDuration] = useState("30s");
  const [isRecording, setIsRecording] = useState(false);
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const eegData = useRef<{ timestamp: number; value: number }[]>([]);
  const eegChar = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connectToDevice = async () => {
    try {
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [EEG_SERVICE] }],
        optionalServices: [EEG_SERVICE],
      });

      const server = await selectedDevice.gatt!.connect();
      const service = await server.getPrimaryService(EEG_SERVICE);
      const char = await service.getCharacteristic(EEG_CHAR);

      await char.startNotifications();

      char.addEventListener("characteristicvaluechanged", handleImpedance);

      eegChar.current = char;
      setDevice(selectedDevice);
      setConnected(true);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleImpedance = (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const impedanceValue = val.getUint8(0); // Simplified; may vary by device
    setImpedance(impedanceValue);
  };

  const startRecording = () => {
    if (!eegChar.current) return;
    eegData.current = [];
    setIsRecording(true);

    eegChar.current.addEventListener("characteristicvaluechanged", handleEEGData);
  };

  const handleEEGData = (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const eegVal = val.getUint8(0);
    eegData.current.push({ timestamp: Date.now(), value: eegVal });
  };

  const stopAndSaveEEG = () => {
    if (!eegChar.current) return;
    eegChar.current.removeEventListener("characteristicvaluechanged", handleEEGData);
    setIsRecording(false);

    const csvContent ="data:text/csv;charset=utf-8,Timestamp,EEG Value\n" +
     eegData.current.map(({ timestamp, value }) => `${new Date(timestamp).toISOString()},${value}`).join("\n");


    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eeg_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>Ear Signals</h2>
      <p>Scan your brain waves with Ear device</p>
      <h3>Bluetooth Status</h3>
      <p>Status: <span style={{ color: connected ? "green" : "red" }}>{connected ? "Connected ✅" : "Disconnected ❌"}</span></p>
      <button onClick={connectToDevice} style={{ backgroundColor: "green", color: "white", padding: "8px 12px", borderRadius: "5px" }}>
        {connected ? "Reconnect" : "Connect"}
      </button>

      {impedance !== null && (
        <p style={{ fontSize: "1.25rem", marginTop: "1rem" }}>
         Impedance: <span style={{ color: impedance < 200 ? "green" : "red", fontWeight: "bold" }}>{impedance.toFixed(2)} kΩ</span>
          <br />
         Quality: <span style={{ color: impedance < 200 ? "green" : "red", fontWeight: "bold" }}>
         {impedance < 100 ? "Excellent" : impedance < 200 ? "Good" : "Insufficient"}
          </span>
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

      <div style={{ marginTop: "1rem" }}>
        <button onClick={startRecording} disabled={!connected || isRecording} style={{ backgroundColor: "blue", color: "white", padding: "10px" }}>Start Recording</button>
        <button onClick={stopAndSaveEEG} disabled={!isRecording} style={{ backgroundColor: "crimson", color: "white", padding: "10px", marginLeft: "1rem" }}>Stop & Download EEG</button>
      </div>
    </div>
  );
};

export default EarScan;
