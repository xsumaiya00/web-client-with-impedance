
import React, { useEffect } from "react";
import BluetoothService from "../BluetoothService";

const EarScan = () => {
  useEffect(() => {
    const scanUUIDsFromEarScan = async () => {
      try {
        console.log("🔍 Connecting to IGEB from EarScan...");
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: "IGEB" }],
          optionalServices: ["battery_service"] // add more if needed
        });

        const server = await device.gatt?.connect();
        if (!server) throw new Error("Could not connect to GATT server");

        const services = await server.getPrimaryServices();
        console.log(`🔗 Found ${services.length} services`);

        for (const service of services) {
          console.log(`✅ Service: ${service.uuid}`);

          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            console.log(`↳ Characteristic: ${char.uuid}`);
          }
        }
      } catch (err) {
        console.error("❌ EarScan UUID discovery failed:", err);
      }
    };

    scanUUIDsFromEarScan();
  }, []);

  return (
    <div className="earscan">
      <h2>Ear Signals</h2>
      <p>Scan your brain waves with Ear device</p>
      <BluetoothService />
    </div>
  );
};

export default EarScan;
