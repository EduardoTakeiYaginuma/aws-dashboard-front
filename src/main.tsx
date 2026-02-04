import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import ClientDashboard from './pages/ClientDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <span className="nav-brand">CloudView</span>
        </nav>
        <div className="container">
          <Routes>
            <Route path="/*" element={<ClientDashboard />} />
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
