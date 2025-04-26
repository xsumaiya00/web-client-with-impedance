import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import EarPrompt from "./pages/EarPrompt";
import EarScan from "./pages/EarScan";
import Home from "./pages/Home";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<EarPrompt />} />
        <Route path="/earscan" element={<EarScan />} />
        
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
