import React from 'react';
import bluetoothIcon from '../assets/download.png';
import { useNavigate } from 'react-router-dom';

const EarPrompt: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/earscan'); // ✅ Make sure your route path matches this
  };

  return (
    <div className="home">
      <img src={bluetoothIcon} alt="Bluetooth Icon" className="bluetooth-icon" />
      <h2>Proceed with following steps:</h2>
      <p>1. Turn on the device</p>
      <p>2. Connect to the "Mindrove" Bluetooth</p>
      <p>3. Click on start</p>
      <button className="home-btn primary" onClick={handleStart}>Start</button>
    </div>
  );
};

export default EarPrompt;
