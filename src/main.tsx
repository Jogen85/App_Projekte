import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ProjectsAdmin from "./pages/ProjectsAdmin";
import ITCostsAdmin from "./pages/ITCostsAdmin";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<ProjectsAdmin />} />
        <Route path="/admin/it-costs" element={<ITCostsAdmin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
