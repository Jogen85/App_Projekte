import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ProjectsAdmin from "./pages/ProjectsAdmin";
import ITCostsAdmin from "./pages/ITCostsAdmin";
import ITCostsDashboard from "./pages/ITCostsDashboard";
import VDBSBudgetDashboard from "./pages/VDBSBudgetDashboard";
import VDBSBudgetAdmin from "./pages/VDBSBudgetAdmin";
import ProjectsDashboard from "./pages/ProjectsDashboard";
import OverallBudgetDashboard from "./pages/OverallBudgetDashboard";
import YearBudgetsAdmin from "./pages/YearBudgetsAdmin";
import "./index.css";
import { ensureSeedData } from "./db/projectsDb";

ensureSeedData().catch((error) => {
  console.error("Failed to prepare IndexedDB", error);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/projects" element={<ProjectsDashboard />} />
        <Route path="/overall-budget" element={<OverallBudgetDashboard />} />
        <Route path="/it-costs" element={<ITCostsDashboard />} />
        <Route path="/vdbs-budget" element={<VDBSBudgetDashboard />} />
        <Route path="/admin" element={<ProjectsAdmin />} />
        <Route path="/admin/it-costs" element={<ITCostsAdmin />} />
        <Route path="/vdbs-budget-admin" element={<VDBSBudgetAdmin />} />
        <Route path="/overall-budget-admin" element={<YearBudgetsAdmin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
