import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import { useToast } from './ToastContext';
import { setAuthToken, setUserRole, getUserRole } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sun, 
  Moon, 
  Search, 
  Bell, 
  User, 
  LogOut, 
  ShieldCheck, 
  Activity, 
  PanelLeftClose, 
  PanelLeftOpen,
  Command,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  ChevronDown,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function TopNavbar({ user, setUser, isSidebarCollapsed, toggleSidebar }) {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const role = getUserRole() || 'CONSUMER';
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Live Date/Time Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K for search modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setUserRole(null);
    setUser(null);
    toast.info('Logged out of FKIP Platform.');
    navigate('/login');
  };

  const getBreadcrumbName = (pathname) => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/copilot': return 'AI Copilot';
      case '/search': return 'Knowledge Search';
      case '/sql-writer': return 'AI SQL Writer';
      case '/oracle': return 'Oracle Intelligence';
      case '/dna': return 'Core Banking';
      case '/opportunities': return 'Opportunities';
      case '/knowledge-graph': return 'Knowledge Graph';
      case '/docs-generator': return 'Document Generator';
      case '/reports': return 'Reports & Analytics';
      case '/admin': return 'Admin Console';
      default: return 'Overview';
    }
  };

  const notifications = [
    { id: 1, title: 'Indexing Complete', time: '10m ago', text: 'core_banking_architecture_spec.txt processed cleanly into 29 text chunks.' },
    { id: 2, title: 'AI Copilot Audit', time: '1h ago', text: 'Qwen 2.5 local model performed 12 queries with average latency of 16.8ms.' },
    { id: 3, title: 'Redundancy Warning', time: '3h ago', text: 'Found 2 matching features across Core Banking apps.' }
  ];

  return (
    <header className="top-navbar">
      {/* Left side: Sidebar Toggle & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={toggleSidebar}
          className="btn-icon"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>FKIP</span>
          <ChevronRight size={14} style={{ opacity: 0.5 }} />
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{getBreadcrumbName(location.pathname)}</span>
        </div>

        {/* Global Search Quick Trigger */}
        <div 
          onClick={() => setSearchModalOpen(true)}
          className="search-trigger-btn"
          style={{ marginLeft: '12px' }}
        >
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Search modules, schemas, docs...</span>
          <div className="search-shortcut-badge">
            <Command size={10} /> K
          </div>
        </div>
      </div>

      {/* Right side: Live Time, System Health, Notifications, Theme Toggle, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Live Date/Time Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }} className="hide-mobile">
          <Clock size={14} style={{ color: 'var(--color-primary)' }} />
          <span>{currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Pulse Status Badge */}
        <div className="system-health-badge">
          <span className="pulse-dot"></span>
          <span className="health-text">Systems Operational</span>
        </div>

        {/* Dark/Light Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="btn-icon"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button 
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="btn-icon"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="notification-dot"></span>
          </button>

          {isNotificationsOpen && (
            <div className="dropdown-menu dropdown-right notification-dropdown">
              <div className="dropdown-header">
                <span style={{ fontWeight: 600, fontSize: '14px' }}>System Notifications</span>
                <span className="badge badge-primary">3 New</span>
              </div>
              <div className="dropdown-body">
                {notifications.map(n => (
                  <div key={n.id} className="notification-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{n.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.time}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button 
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="profile-trigger-btn"
          >
            <div className="avatar-circle">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }} className="hide-mobile">
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.2' }}>
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                {role}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {isProfileOpen && (
            <div className="dropdown-menu dropdown-right profile-dropdown">
              <div className="dropdown-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{user?.email}</span>
                <span className={`badge badge-${role === 'ADMIN' ? 'primary' : 'secondary'}`}>Role: {role}</span>
              </div>
              <div className="dropdown-divider"></div>
              <button 
                onClick={handleLogout}
                className="dropdown-item danger"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      {searchModalOpen && (
        <div className="modal-overlay" onClick={() => setSearchModalOpen(false)}>
          <div className="modal-content search-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <Search size={20} style={{ color: 'var(--color-primary)' }} />
              <input
                type="text"
                className="form-input-bare"
                placeholder="Type to search modules, schemas, documents..."
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                autoFocus
                style={{ width: '100%', fontSize: '16px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)' }}
              />
              <span className="search-shortcut-badge">ESC</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>QUICK MODULE NAVIGATION</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { path: '/', title: 'Executive Dashboard', desc: 'System telemetry & metrics' },
                { path: '/copilot', title: 'AI Copilot Workspace', desc: 'Real-time assistant chat' },
                { path: '/search', title: 'Knowledge Search Explorer', desc: 'Hybrid RAG search' },
                { path: '/sql-writer', title: 'AI SQL Writer Studio', desc: 'Oracle & PG SQL generator' },
                { path: '/oracle', title: 'Oracle Intelligence', desc: 'DDL impact tracing' },
                { path: '/dna', title: 'Core Banking Catalog', desc: 'System redundancy auditing' }
              ].map(m => (
                <div 
                  key={m.path}
                  onClick={() => { navigate(m.path); setSearchModalOpen(false); }}
                  className="quick-search-item"
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
