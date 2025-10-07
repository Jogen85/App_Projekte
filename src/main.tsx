import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ProjectsAdmin from "./pages/ProjectsAdmin";
import ITCostsAdmin from "./pages/ITCostsAdmin";
import ITCostsDashboard from "./pages/ITCostsDashboard";
import VDBSBudgetDashboard from "./pages/VDBSBudgetDashboard";
import VDBSBudgetAdmin from "./pages/VDBSBudgetAdmin";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/it-costs" element={<ITCostsDashboard />} />
        <Route path="/vdbs-budget" element={<VDBSBudgetDashboard />} />
        <Route path="/admin" element={<ProjectsAdmin />} />
        <Route path="/admin/it-costs" element={<ITCostsAdmin />} />
        <Route path="/vdbs-budget-admin" element={<VDBSBudgetAdmin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
