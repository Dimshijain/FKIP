import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard } from '../components/SkeletonLoader';
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
  Search
} from 'lucide-react';

export default function AdminDashboard() {
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const usersData = await api.get('/admin/users');
      const statsData = await api.get('/admin/monitoring');
      setUsersList(usersData);
      setStats(statsData);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fetch admin monitoring data.');
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ animation: 'spin 2s linear infinite', color: 'var(--color-primary)', margin: '0 auto 16px auto' }} />
        <h3>Loading System Status...</h3>
      </div>
    );
  }

  return (
    <div className="workspace-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={32} style={{ color: 'var(--color-primary)' }} />
            <span>Admin Console</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Monitor active container engines, inspect resource sizes, and manage enterprise user access settings.
          </p>
        </div>
        <button onClick={fetchAdminData} className="btn btn-secondary" style={{ gap: '8px' }}>
          <RefreshCw size={16} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: 'var(--status-failed)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Monitoring Grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          
          {/* Card 1: Postgres */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Database Engine</span>
                <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '20px' }}>PostgreSQL</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: stats.postgres_status.status === 'healthy' ? '#22c55e' : '#ef4444',
                  boxShadow: stats.postgres_status.status === 'healthy' ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
                }} className="pulse-dot" />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>{stats.postgres_status.status}</span>
              </div>
            </div>
            <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>DB size:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{formatBytes(stats.db_size_bytes)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tables count:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>10 active tables</span>
              </div>
            </div>
          </div>

          {/* Card 2: Weaviate */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vector Index</span>
                <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '20px' }}>Weaviate</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: stats.weaviate_status.status === 'healthy' ? '#22c55e' : '#ef4444',
                  boxShadow: stats.weaviate_status.status === 'healthy' ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
                }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>{stats.weaviate_status.status}</span>
              </div>
            </div>
            <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Estimated Index size:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{formatBytes(stats.weaviate_size_bytes)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Collections:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>DocumentChunk, DnaAppFeature</span>
              </div>
            </div>
          </div>

          {/* Card 3: Ollama */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Inference</span>
                <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '20px' }}>Ollama</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: stats.ollama_status.status === 'healthy' ? '#22c55e' : '#ef4444',
                  boxShadow: stats.ollama_status.status === 'healthy' ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
                }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>{stats.ollama_status.status}</span>
              </div>
            </div>
            <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {stats.ollama_status.details}
            </div>
          </div>

          {/* Card 4: Host Hardware */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Hardware</span>
                <h3 style={{ color: 'var(--text-main)', marginTop: '4px', fontSize: '20px' }}>Resource Usage</h3>
              </div>
              <Activity size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>CPU load:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{stats.cpu_percent}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Memory load:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{stats.memory_percent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User management and database summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
        
        {/* User Roles Management Card */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={20} style={{ color: 'var(--color-primary)' }} />
            <span>User access control</span>
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 8px' }}>Email ID</th>
                  <th style={{ padding: '12px 8px' }}>Role</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(usr => (
                  <tr key={usr.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                    <td style={{ padding: '12px 8px', color: 'var(--text-main)', fontWeight: 500 }}>{usr.email}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: usr.role === 'ADMIN' ? 'rgba(239,68,68,0.1)' : usr.role === 'CREATOR' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                        color: usr.role === 'ADMIN' ? 'var(--status-failed)' : usr.role === 'CREATOR' ? '#3b82f6' : 'var(--text-muted)',
                        fontWeight: 600
                      }}>
                        {usr.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <select
                        value={usr.role}
                        onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                        disabled={isUpdating}
                        style={{
                          background: '#0d1321',
                          color: 'var(--text-main)',
                          border: '1px solid var(--border-color)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
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
        </div>

        {/* Database Metrics Table Summary */}
        {stats && (
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <HardDrive size={20} style={{ color: 'var(--color-primary)' }} />
              <span>Relational volumes</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#0d1321', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>User Accounts</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{stats.users_count} records</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#0d1321', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Ingested Documents</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{stats.documents_count} files</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#0d1321', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Extracted Text Chunks</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{stats.chunks_count} indexed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#0d1321', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Opportunities Discovered</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{stats.opportunities_count} logged</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
