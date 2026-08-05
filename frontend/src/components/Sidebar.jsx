import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Database, 
  AppWindow, 
  Lightbulb, 
  LogOut, 
  Cpu,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Network,
  FileText,
  Terminal
} from 'lucide-react';
import { setAuthToken, setUserRole, getUserRole } from '../services/api';

export default function Sidebar({ user, setUser }) {
  const navigate = useNavigate();
  const role = getUserRole() || 'CONSUMER';

  const handleLogout = () => {
    setAuthToken(null);
    setUserRole(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Cpu size={28} className="sidebar-logo-icon" />
        <span>FKIP</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink 
          to="/" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/copilot" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={20} />
          <span>AI Copilot</span>
        </NavLink>
        
        <NavLink 
          to="/search" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Search size={20} />
          <span>Knowledge Search</span>
        </NavLink>

        <NavLink 
          to="/sql-writer" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Terminal size={20} />
          <span>AI SQL Writer</span>
        </NavLink>
        
        <NavLink 
          to="/oracle" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Database size={20} />
          <span>Oracle Intelligence</span>
        </NavLink>
        
        <NavLink 
          to="/dna" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <AppWindow size={20} />
          <span>Core Banking</span>
        </NavLink>
        
        <NavLink 
          to="/opportunities" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Lightbulb size={20} />
          <span>Opportunities</span>
        </NavLink>

        <NavLink 
          to="/knowledge-graph" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Network size={20} />
          <span>Knowledge Graph</span>
        </NavLink>

        <NavLink 
          to="/docs-generator" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>Doc Generator</span>
        </NavLink>
        
        <NavLink 
          to="/reports" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={20} />
          <span>Reports & Analytics</span>
        </NavLink>

        {role === 'ADMIN' && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <ShieldCheck size={20} />
            <span>Admin Console</span>
          </NavLink>
        )}
      </nav>

      {user && (
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-email" title={user.email}>{user.email}</span>
              <span className="user-role">{role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-full" style={{ gap: '8px' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </aside>
  );
}
