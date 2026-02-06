import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import LandingPage from './pages/LandingPage';
import FreeTest from './pages/FreeTest';
import ClientDashboard from './pages/ClientDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - sem navegacao */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/free-test" element={<FreeTest />} />

        {/* Dashboard - com navegacao */}
        <Route path="/dashboard/*" element={
          <div className="app">
            <nav className="nav">
              <a href="/" className="nav-brand">CloudCost</a>
            </nav>
            <div className="container">
              <ClientDashboard />
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
