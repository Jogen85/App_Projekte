import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ProjectsAdmin from "./pages/ProjectsAdmin";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<ProjectsAdmin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
