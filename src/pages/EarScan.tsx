import React, { useState } from "react";

const EarScan: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [impedance, setImpedance] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState("30s");
  const [eegData, setEegData] = useState<string[][]>([]);

  let eegListener: ((event: Event) => void) | null = null;

  const SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

const connectToDevice = async () => {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "IGEB" }],
      optionalServices: [SERVICE_UUID],
    });

    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService(SERVICE_UUID);
    const impedanceChar = await service?.getCharacteristic(CHARACTERISTIC_UUID);

    if (!impedanceChar) {
      alert("Could not find impedance characteristic.");
      return;
    }

    await impedanceChar.startNotifications();
    impedanceChar.addEventListener("characteristicvaluechanged", (event: any) => {
      const value = event.target.value.getUint8(0); // Adjust based on actual byte structure
      setImpedance(value);
    });

    setConnected(true);
  } catch (error) {
    alert("Connection failed: " + error);
  }
};


  const parseDuration = (str: string) => {
    if (str.endsWith("s")) return parseInt(str) * 1000;
    if (str.endsWith("m")) return parseInt(str) * 60 * 1000;
    return 30000;
  };

  const startRecording = async () => {
    setRecording(true);
    setEegData([]);

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "IGEB" }],
      optionalServices: ["device_information"],
    });

    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService("device_information");
    const eegChar = await service?.getCharacteristic("manufacturer_name_string");

    if (!eegChar) {
      alert("EEG characteristic not found.");
      return;
    }

    await eegChar.startNotifications();
    eegListener = (event: any) => {
      const value = event.target.value.getUint8(0); // Simulated EEG value
      const timestamp = new Date().toISOString();
      setEegData((prev) => [...prev, [timestamp, value.toString()]]);
    };

    eegChar.addEventListener("characteristicvaluechanged", eegListener);

    setTimeout(() => stopAndSaveEEG(eegChar), parseDuration(duration));
  };

  const stopAndSaveEEG = async (eegChar: BluetoothRemoteGATTCharacteristic | null) => {
    setRecording(false);
    if (!eegData.length) return;

    if (eegChar && eegListener) {
      eegChar.removeEventListener("characteristicvaluechanged", eegListener);
    }

    const header = ["Timestamp", "EEG Value"];
    const rows = [header, ...eegData];
    const csv = rows.map((r) => r.join(",")).join("\n");

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
      <h2>Ear EEG Scanner</h2>
      <button
        onClick={connectToDevice}
        style={{ background: "green", color: "white", padding: "10px" }}
      >
        {connected ? "Reconnect" : "Connect to Device"}
      </button>

      {impedance !== null && (
        <p style={{ marginTop: "1rem", color: impedance < 200 ? "green" : "red" }}>
          Impedance: <strong>{impedance.toFixed(2)} kΩ</strong>
        </p>
      )}

      <div style={{ marginTop: "1rem" }}>
        <label>Recording Duration: </label>
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="30s or 1m"
          style={{ padding: "4px", width: "100px", marginLeft: "8px" }}
        />
      </div>

      <button
        onClick={startRecording}
        disabled={!connected || (impedance !== null && impedance > 200)}
        style={{
          backgroundColor: "blue",
          color: "white",
          marginTop: "10px",
          padding: "10px",
        }}
      >
        Start EEG Recording
      </button>
    </div>
  );
};

export default EarScan;
