import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import EarPrompt from './pages/EarPrompt';
import EarScan from './pages/EarScan';
import UUIDScannerPage from './pages/UUIDScannerPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/prompt" element={<EarPrompt />} />
      <Route path="/scan" element={<EarScan />} />
      <Route path="/uuid-scan" element={<UUIDScannerPage />} /> {/* ← New route */}
    </Routes>
  );
};

export default App;
