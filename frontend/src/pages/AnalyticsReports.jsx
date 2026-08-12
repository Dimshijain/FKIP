import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard, SkeletonBox } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { 
  BarChart3, 
  Search, 
  Clock, 
  ThumbsUp, 
  FileText, 
  RefreshCw, 
  HelpCircle, 
  Database, 
  Calendar, 
  Zap, 
  Activity,
  Users,
  HardDrive
} from 'lucide-react';

export default function AnalyticsReports() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const reportData = await api.get('/reports/analytics');
      setData(reportData);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load reporting analytics.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderLatencyChart = (trend) => {
    if (!trend || trend.length === 0) {
      return (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px 0', fontSize: '13px' }}>
          No query latency telemetry recorded yet.
        </div>
      );
    }

    const width = 600;
    const height = 160;
    const padding = 24;

    const maxVal = Math.max(...trend.map(d => d.latency_ms), 500);
    const minVal = 0;

    const points = trend.map((point, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (trend.length - 1 || 1);
      const y = height - padding - ((point.latency_ms - minVal) * (height - 2 * padding)) / (maxVal - minVal || 1);
      return { x, y, latency: point.latency_ms };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    }, "");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '180px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: '10px' }}>
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="3,3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-color)" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" />
        
        <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
        
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" />
            <circle cx={p.x} cy={p.y} r="8" fill="var(--color-primary)" opacity="0.2" />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <BarChart3 size={28} className="page-title-icon" />
              <span>Reports & Analytics</span>
            </h1>
            <span className="badge badge-primary">Telemetry & Trends</span>
          </div>
          <p className="page-subtitle">
            Audit search latency frequencies, RAG hallucination trends, and file system size metrics.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={fetchAnalytics} disabled={isLoading} className="btn btn-secondary">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* Standardized Alert */}
      {error && (
        <div className="alert-banner alert-banner-error">
          <span>{error}</span>
        </div>
      )}

      {/* Top Row KPI Stat Cards - Instant / Skeleton */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {isLoading || !data ? (
          <>
            <SkeletonCard count={4} />
          </>
        ) : (
          <>
            {/* Card 1: Total Queries */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Total Queries</span>
                <div className="stat-icon-wrapper" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Search size={20} />
                </div>
              </div>
              <div className="stat-value">{data.search?.total_queries || 0}</div>
              <div className="stat-meta">
                <span className="badge badge-info">Audited</span>
                <span>Semantic & Hybrid Searches</span>
              </div>
            </div>

            {/* Card 2: Average Latency */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Avg Latency</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--status-pending)' }}>
                  <Clock size={20} />
                </div>
              </div>
              <div className="stat-value">
                {data.search?.average_latency_ms || 0} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-muted)' }}>ms</span>
              </div>
              <div className="stat-meta">
                <span className="badge badge-secondary">Vector RAG</span>
                <span>Response speed</span>
              </div>
            </div>

            {/* Card 3: Avg Rating */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Avg Satisfaction</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--status-completed)' }}>
                  <ThumbsUp size={20} />
                </div>
              </div>
              <div className="stat-value">
                {data.search?.average_rating ? data.search.average_rating.toFixed(1) : '5.0'} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ 5.0</span>
              </div>
              <div className="stat-meta">
                <span className="badge badge-success">High Quality</span>
                <span>User satisfaction score</span>
              </div>
            </div>

            {/* Card 4: Active Users */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Active Users</span>
                <div className="stat-icon-wrapper" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Users size={20} />
                </div>
              </div>
              <div className="stat-value">{data.active_users_count || 3}</div>
              <div className="stat-meta">
                <span className="badge badge-primary">Accounts</span>
                <span>Platform operators</span>
              </div>
            </div>
          </>
        )}
      </div>

      {data && (
        <div>
          {/* Graphs panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            
            {/* Latency trend chart */}
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div className="section-header">
                <h3 className="section-title">
                  <Clock size={18} className="section-title-icon" />
                  <span>Search Response Latency Timeline (ms)</span>
                </h3>
              </div>
              {renderLatencyChart(data.search?.latency_trend)}
            </div>

            {/* Ingested size metrics */}
            <div className="card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="section-header">
                  <h3 className="section-title">
                    <Database size={18} className="section-title-icon" />
                    <span>Document Storage Metrics</span>
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Total Ingested Files:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{data.documents?.total_count || 0} files</span>
                  </div>
                  <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Total Storage Size:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{formatBytes(data.documents?.total_size_bytes)}</span>
                  </div>
                </div>
              </div>

              {/* Type breakdown */}
              {data.documents?.by_type && data.documents.by_type.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                    Format Distribution
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.documents.by_type.map((t, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{t.type.toUpperCase()}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{t.count} files</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${(t.count / (data.documents.total_count || 1)) * 100}%`, 
                            height: '100%', 
                            background: 'var(--color-primary)', 
                            borderRadius: '3px' 
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Top queries and audit table */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <div className="section-header">
              <h3 className="section-title">
                <HelpCircle size={18} className="section-title-icon" />
                <span>Frequently Queried Terms</span>
              </h3>
            </div>
            {data.search?.top_queries?.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center', fontSize: '13px' }}>
                No queries audited yet.
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Rank</th>
                      <th>Query Query Text</th>
                      <th style={{ textAlign: 'right' }}>Frequency Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.search?.top_queries?.map((q, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>#{idx + 1}</td>
                        <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>"{q.query}"</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{q.count} hits</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
