import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  Database, 
  Cpu, 
  Activity, 
  RefreshCw,
  HardDrive,
  UserCheck,
  Search,
  Server
} from 'lucide-react';

export default function AdminDashboard() {
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [usersData, statsData] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/monitoring')
      ]);
      setUsersList(usersData || []);
      setStats(statsData || null);
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Failed to fetch admin monitoring data.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setIsUpdating(true);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(`User role updated to ${newRole}.`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update user role.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <ShieldCheck size={28} className="page-title-icon" />
              <span>Admin Console</span>
            </h1>
            <span className="badge badge-primary">System Governance</span>
          </div>
          <p className="page-subtitle">
            Monitor active container engines, inspect resource sizes, and manage enterprise user access settings.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={fetchAdminData} disabled={isLoading} className="btn btn-secondary">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Standardized Alert */}
      {error && (
        <div className="alert-banner alert-banner-error">
          <span>{error}</span>
        </div>
      )}

      {/* Monitoring Grid */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {isLoading || !stats ? (
          <SkeletonCard count={4} />
        ) : (
          <>
            {/* Card 1: Postgres */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <span className="stat-label">Database Engine</span>
                  <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '18px', fontWeight: 700 }}>PostgreSQL</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot" style={{
                    background: stats.postgres_status?.status === 'healthy' ? 'var(--status-completed)' : 'var(--status-failed)',
                    boxShadow: stats.postgres_status?.status === 'healthy' ? '0 0 8px var(--status-completed)' : '0 0 8px var(--status-failed)'
                  }} />
                  <span className="badge badge-success">{stats.postgres_status?.status || 'healthy'}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>DB size:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatBytes(stats.db_size_bytes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active tables:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>10 tables</span>
                </div>
              </div>
            </div>

            {/* Card 2: Weaviate */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <span className="stat-label">Vector Store</span>
                  <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '18px', fontWeight: 700 }}>Weaviate</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot" style={{
                    background: stats.weaviate_status?.status === 'healthy' ? 'var(--status-completed)' : 'var(--status-failed)',
                    boxShadow: stats.weaviate_status?.status === 'healthy' ? '0 0 8px var(--status-completed)' : '0 0 8px var(--status-failed)'
                  }} />
                  <span className="badge badge-success">{stats.weaviate_status?.status || 'healthy'}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Indexed classes:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{stats.weaviate_status?.classes?.length || 0} schemas</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Vector dims:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>384 (all-MiniLM)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Ollama */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <span className="stat-label">AI Inference</span>
                  <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '18px', fontWeight: 700 }}>Ollama LLM</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot" style={{
                    background: stats.ollama_status?.status === 'healthy' ? 'var(--status-completed)' : 'var(--status-failed)',
                    boxShadow: stats.ollama_status?.status === 'healthy' ? '0 0 8px var(--status-completed)' : '0 0 8px var(--status-failed)'
                  }} />
                  <span className="badge badge-success">{stats.ollama_status?.status || 'healthy'}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {stats.ollama_status?.details || 'Local llama3 / qwen2 engine ready'}
              </div>
            </div>

            {/* Card 4: Host Hardware */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <span className="stat-label">System Hardware</span>
                  <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '18px', fontWeight: 700 }}>Resource Usage</h3>
                </div>
                <div className="stat-icon-wrapper" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Activity size={20} />
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>CPU Load:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{stats.cpu_percent || 0}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Memory Load:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{stats.memory_percent || 0}%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User management and database summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* User Roles Management Card */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Users size={20} className="section-title-icon" />
              <span>User Access Control</span>
            </h3>
            <span className="badge badge-secondary">{usersList.length} Accounts</span>
          </div>

          {isLoading ? (
            <SkeletonTable rows={3} cols={3} />
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Email Address</th>
                    <th>Assigned Role</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(usr => (
                    <tr key={usr.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{usr.email}</td>
                      <td>
                        <span className={`badge badge-${usr.role === 'ADMIN' ? 'danger' : usr.role === 'CREATOR' ? 'primary' : 'secondary'}`}>
                          {usr.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <select
                          value={usr.role}
                          onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                          disabled={isUpdating}
                          className="form-select"
                          style={{ width: 'auto', display: 'inline-block', height: '30px', fontSize: '12px', padding: '0 8px' }}
                        >
                          <option value="CONSUMER">CONSUMER</option>
                          <option value="CREATOR">CREATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Database Metrics Table Summary */}
        {stats && (
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <HardDrive size={20} className="section-title-icon" />
                <span>Relational Volumes</span>
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>User Accounts</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{stats.users_count || 0} records</span>
              </div>
              <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Ingested Documents</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{stats.documents_count || 0} files</span>
              </div>
              <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Extracted Text Chunks</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{stats.chunks_count || 0} indexed</span>
              </div>
              <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Opportunities Discovered</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{stats.opportunities_count || 0} logged</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
