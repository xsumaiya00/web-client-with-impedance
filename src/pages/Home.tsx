import React from 'react';
import './Home.css';
import logo from '../assets/icon.png';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/scan");
 // go to EarPrompt, not /earscan
  };

  return (
    <div className="home">
      <img src={logo} alt="App Logo" className="home-logo" />
      <h1 className="home-title">CANE</h1>
      <button className="home-btn primary" onClick={handleStart}>Sign Up</button>
      <button className="home-btn secondary" onClick={handleStart}>Sign In</button>
    </div>
  );
};

export default Home;
