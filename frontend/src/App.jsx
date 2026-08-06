import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KnowledgeSearch from './pages/KnowledgeSearch';
import OracleIntelligence from './pages/OracleIntelligence';
import DnaCatalog from './pages/DnaCatalog';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsReports from './pages/AnalyticsReports';
import AiCopilot from './pages/AiCopilot';
import InnovationPipeline from './pages/InnovationPipeline';
import KnowledgeGraph from './pages/KnowledgeGraph';
import DocGenerator from './pages/DocGenerator';
import SqlWriter from './pages/SqlWriter';
import { api, getAuthToken } from './services/api';
import { ToastProvider } from './components/ToastContext';
import { Cpu, AlertTriangle } from 'lucide-react';

// Shared Placeholder Page (for non-implemented Phase 3 scopes if any)
function FeaturePlaceholder({ title, description }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
      <Cpu size={64} style={{ opacity: 0.15, margin: '0 auto 24px auto', color: 'var(--color-primary)' }} />
      <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '12px' }}>{title}</h1>
      <p style={{ maxWidth: '600px', margin: '0 auto 24px auto' }}>{description}</p>
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        background: 'rgba(234, 179, 8, 0.1)', 
        color: 'var(--status-pending)', 
        padding: '12px 24px', 
        borderRadius: '8px',
        fontSize: '14px',
        border: '1px solid rgba(234, 179, 8, 0.2)'
      }}>
        <AlertTriangle size={16} />
        <span>Planned for Phase 3: Innovation Pipeline</span>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const profile = await api.me();
          setUser(profile);
        } catch (err) {
          console.error("Token verification failed", err);
        }
      }
      setIsInitializing(false);
    };
    initializeAuth();
  }, []);

  if (isInitializing) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#090d16'
      }}>
        <Cpu size={48} className="animate-pulse" style={{ animation: 'pulse 2s infinite', color: 'var(--color-primary)' }} />
        <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Initializing FKIP Enterprise Suite...</span>
        
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Unauthenticated portal */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <Login setUser={setUser} />} 
          />

          {/* Authenticated workspace wrapper */}
          <Route
            path="/*"
            element={
              user ? (
                <div className="app-container">
                  <Sidebar user={user} setUser={setUser} />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/copilot" element={<AiCopilot />} />
                      <Route path="/search" element={<KnowledgeSearch />} />
                      <Route path="/sql-writer" element={<SqlWriter />} />
                      <Route path="/oracle" element={<OracleIntelligence />} />
                      <Route path="/dna" element={<DnaCatalog />} />
                      <Route path="/opportunities" element={<InnovationPipeline />} />
                      <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
                      <Route path="/docs-generator" element={<DocGenerator />} />
                      <Route path="/reports" element={<AnalyticsReports />} />
                      
                      {user.role === 'ADMIN' && (
                        <Route path="/admin" element={<AdminDashboard />} />
                      )}
                      
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
