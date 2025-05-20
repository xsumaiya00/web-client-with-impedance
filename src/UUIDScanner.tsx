import React, { useState } from 'react';

const UUIDScanner: React.FC = () => {
  const [log, setLog] = useState<string[]>([]);

  const logMessage = (msg: string) => {
    setLog(prev => [...prev, msg]);
  };

  const scanUUIDs = async () => {
    try {
      logMessage("🔍 Requesting IGEB device...");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'IGEB' }],
        optionalServices: ['battery_service']
      });

      const server = await device.gatt?.connect();
      if (!server) {
        logMessage("❌ Failed to connect to GATT server.");
        return;
      }

      const services = await server.getPrimaryServices();
      for (const service of services) {
        logMessage(`🟢 Service: ${service.uuid}`);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          logMessage(`  ↳ Characteristic: ${char.uuid}`);
        }
      }

    } catch (err: any) {
      logMessage(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>🔗 UUID Scanner</h2>
      <button onClick={scanUUIDs} style={{ padding: '8px 16px', marginBottom: '1rem' }}>
        Scan IGEB Device
      </button>
      <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#111', color: '#0f0', padding: '1rem', borderRadius: '6px' }}>
        {log.map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </div>
    </div>
  );
};

export default UUIDScanner;
