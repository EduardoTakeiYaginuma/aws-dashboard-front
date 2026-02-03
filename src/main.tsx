import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './index.css';
import Dashboard from './pages/Dashboard';
import Workspaces from './pages/Workspaces';
import WorkspaceRecommendations from './pages/WorkspaceRecommendations';
import RecommendationDetail from './pages/RecommendationDetail';
import WorkspaceResources from './pages/WorkspaceResources';
import InfrastructureDiagram from './pages/InfrastructureDiagram';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <span className="nav-brand">FinOps Dashboard</span>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/workspaces">Workspaces</NavLink>
        </nav>
        <div className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/workspaces/:id/recommendations" element={<WorkspaceRecommendations />} />
            <Route path="/workspaces/:id/resources" element={<WorkspaceResources />} />
            <Route path="/workspaces/:id/diagram" element={<InfrastructureDiagram />} />
            <Route path="/recommendations/:id" element={<RecommendationDetail />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
