import React from "react";
import BluetoothService from "../BluetoothService";

const EarScan = () => {
  return (
    <div className="earscan">
      <h2>Ear Signals</h2>
      <p>Scan your brain waves with Ear device</p>
      <BluetoothService />
    </div>
  );
};

export default EarScan;
