import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import EarPrompt from './pages/EarPrompt';
import EarScan from './pages/EarScan';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/prompt" element={<EarPrompt />} />
      <Route path="/scan" element={<EarScan />} />
    </Routes>
  );
};

export default App;
