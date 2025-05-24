import React, { useState } from "react";

const EarScan: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState("30s");
  const [eegData, setEegData] = useState<string[][]>([]);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [eegChar, setEegChar] = useState<BluetoothRemoteGATTCharacteristic | null>(null);

  const SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb";
  const IMPEDANCE_UUID = "00002a19-0000-1000-8000-00805f9b34fb";
  const EEG_UUID = "00002a19-0000-1000-8000-00805f9b34fb"; // Use same unless IDUN provides different one

  let eegListener: (event: Event) => void;

  const parseDuration = (str: string) => {
    if (str.endsWith("s")) return parseInt(str) * 1000;
    if (str.endsWith("m")) return parseInt(str) * 60 * 1000;
    return 30000;
  };

  const connectToDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "IGEB" }],
        optionalServices: [SERVICE_UUID],
      });

      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService(SERVICE_UUID);

      const impChar = await service?.getCharacteristic(IMPEDANCE_UUID);
      const eegCharacteristic = await service?.getCharacteristic(EEG_UUID);

      if (!impChar || !eegCharacteristic) {
        alert("Unable to find required characteristics.");
        return;
      }

      // Start Impedance Notifications
      await impChar.startNotifications();
      impChar.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = event.target.value.getUint8(0);
        setImpedance(value);
      });

      setCharacteristic(impChar);
      setEegChar(eegCharacteristic);
      setConnected(true);
    } catch (err) {
      alert("Connection failed: " + err);
    }
  };

  const startRecording = async () => {
    if (!eegChar) {
      alert("EEG characteristic not available.");
      return;
    }

    setRecording(true);
    setEegData([]);

    await eegChar.startNotifications();

    eegListener = (event: any) => {
      const value = event.target.value.getUint8(0);
      const timestamp = new Date().toISOString();
      setEegData((prev) => [...prev, [timestamp, value.toString()]]);
    };

    eegChar.addEventListener("characteristicvaluechanged", eegListener);

    setTimeout(() => stopAndSaveEEG(), parseDuration(duration));
  };

  const stopAndSaveEEG = async () => {
    setRecording(false);

    if (!eegData.length || !eegChar) return;

    eegChar.removeEventListener("characteristicvaluechanged", eegListener);

    const header = ["Timestamp", "EEG Value"];
    const csv = [header, ...eegData].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eeg_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Ear Signals</h2>
      <p>Scan your brain waves with Ear device</p>

      <h3>Bluetooth Status</h3>
      <p>Status: <span style={{ color: connected ? "green" : "red" }}>
        {connected ? "Connected ✅" : "Disconnected ❌"}
      </span></p>

      <button onClick={connectToDevice} style={{ backgroundColor: "green", color: "white", padding: "8px 12px", borderRadius: "6px" }}>
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
        disabled={!connected || (impedance !== null && impedance > 200)}
        style={{
          backgroundColor: "blue",
          color: "white",
          marginTop: "10px",
          padding: "10px"
        }}
      >
        Start Recording
      </button>
      <button
        onClick={stopAndSaveEEG}
        disabled={!recording}
        style={{
          backgroundColor: "crimson",
          color: "white",
          marginLeft: "10px",
          padding: "10px"
        }}
      >
        Stop & Download EEG
      </button>
    </div>
  );
};

export default EarScan;
