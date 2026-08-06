import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Database, 
  AppWindow, 
  Lightbulb, 
  Cpu,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Network,
  FileText,
  Terminal,
  ChevronRight
} from 'lucide-react';
import { getUserRole } from '../services/api';

export default function Sidebar({ isCollapsed }) {
  const role = getUserRole() || 'CONSUMER';

  const menuSections = [
    {
      title: 'INTELLIGENCE & AI',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/copilot', label: 'AI Copilot', icon: MessageSquare, badge: 'SSE' },
        { path: '/search', label: 'Knowledge Search', icon: Search, badge: 'RAG' },
        { path: '/sql-writer', label: 'AI SQL Writer', icon: Terminal, badge: 'New' }
      ]
    },
    {
      title: 'DATA & SYSTEMS',
      items: [
        { path: '/oracle', label: 'Oracle Intelligence', icon: Database },
        { path: '/dna', label: 'Core Banking', icon: AppWindow },
        { path: '/opportunities', label: 'Opportunities', icon: Lightbulb },
        { path: '/knowledge-graph', label: 'Knowledge Graph', icon: Network }
      ]
    },
    {
      title: 'REPORTS & MANAGEMENT',
      items: [
        { path: '/docs-generator', label: 'Doc Generator', icon: FileText },
        { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
        ...(role === 'ADMIN' ? [{ path: '/admin', label: 'Admin Console', icon: ShieldCheck, badge: 'Admin' }] : [])
      ]
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-logo">
        <div className="logo-icon-wrapper">
          <Cpu size={22} className="sidebar-logo-icon" />
        </div>
        {!isCollapsed && (
          <div className="brand-text-wrapper">
            <span className="brand-name">FKIP</span>
            <span className="brand-subtext">Enterprise Suite</span>
          </div>
        )}
      </div>

      {/* Navigation Links Grouped by Section */}
      <nav className="sidebar-menu">
        {menuSections.map((section, idx) => (
          <div key={idx} className="menu-section">
            {!isCollapsed && <div className="section-title">{section.title}</div>}
            {section.items.map(item => {
              const IconComp = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <IconComp size={18} className="link-icon" />
                  {!isCollapsed && (
                    <span className="link-label">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className={`link-badge ${item.badge === 'Admin' ? 'admin' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
