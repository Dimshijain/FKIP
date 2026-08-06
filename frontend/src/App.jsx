import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
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
import { ThemeProvider } from './components/ThemeContext';
import { Cpu } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

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
        <Cpu size={48} className="animate-pulse" style={{ animation: 'pulse 2s infinite', color: '#6366f1' }} />
        <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Initializing FKIP Enterprise SaaS...</span>
        
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
    <ThemeProvider>
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
                  <div className="app-shell">
                    <Sidebar 
                      user={user} 
                      setUser={setUser} 
                      isCollapsed={isSidebarCollapsed}
                    />
                    
                    <div className="main-wrapper">
                      <TopNavbar 
                        user={user} 
                        setUser={setUser}
                        isSidebarCollapsed={isSidebarCollapsed}
                        toggleSidebar={toggleSidebar}
                      />

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
                  </div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}
