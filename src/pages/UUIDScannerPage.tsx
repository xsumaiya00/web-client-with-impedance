import React from 'react';
import UUIDScanner from '../UUIDScanner'; // ✅ correct path


const UUIDScannerPage: React.FC = () => {
  return (
    <div>
      <h1>🔎 UUID Scanner Page</h1>
      <UUIDScanner />
    </div>
  );
};

export default UUIDScannerPage;
