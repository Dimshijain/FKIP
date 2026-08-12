import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard } from '../components/SkeletonLoader';
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
  Activity
} from 'lucide-react';

export default function AnalyticsReports() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7D');
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
      setError(err.response?.data?.detail || 'Failed to load reporting analytics.');
    } finally {
      setIsLoading(false);
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
        <h3>Compiling Analytics reports...</h3>
      </div>
    );
  }

  // Generate SVG Line Chart coords for Latency Trend
  const renderLatencyChart = (trend) => {
    if (!trend || trend.length === 0) {
      return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No query latency logs recorded.</div>;
    }

    const width = 600;
    const height = 160;
    const padding = 20;

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
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '180px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '10px' }}>
        {/* Horizontal gridlines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="3,3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-color)" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" />
        
        {/* Draw main line path */}
        <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
        
        {/* Draw interactive nodes */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" />
            <circle cx={p.x} cy={p.y} r="8" fill="var(--color-primary)" opacity="0.2" className="hover:opacity-100 cursor-pointer" />
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
          <button onClick={fetchAnalytics} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* Standardized Alert */}
      {error && (
        <div className="alert-banner alert-banner-error">
          {error}
        </div>
      )}

      {data && (
        <div>
          {/* Standardized Top Row KPI Stat Cards */}
          <div className="stats-grid">
            
            {/* Card 1: Total Queries */}
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Total Queries</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <Search size={20} />
                </div>
              </div>
              <div className="stat-value">{data.search.total_queries}</div>
              <div className="stat-meta">
                <span className="badge badge-info">Audited</span>
                <span>Semantic & Hybrid Searches</span>
              </div>
            </div>

            {/* Card 2: Average Latency */}
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Avg Latency</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--status-pending)' }}>
                  <Clock size={20} />
                </div>
              </div>
              <div className="stat-value">{data.search.average_latency_ms} <span style={{ fontSize: '16px', fontWeight: 'normal', color: 'var(--text-muted)' }}>ms</span></div>
              <div className="stat-meta">
                <span className="badge badge-secondary">Vector RAG</span>
                <span>Response speed</span>
              </div>
            </div>

            {/* Card 3: Avg Rating */}
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Avg Rating</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--status-completed)' }}>
                  <ThumbsUp size={20} />
                </div>
              </div>
              <div className="stat-value">{data.search.average_rating.toFixed(1)} <span style={{ fontSize: '16px', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ 5.0</span></div>
              <div className="stat-meta">
                <span className="badge badge-success">High Quality</span>
                <span>User satisfaction score</span>
              </div>
            </div>

            {/* Card 4: Active Users */}
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Active Users</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                  <Clock size={20} />
                </div>
              </div>
              <div className="stat-value">{data.active_users_count}</div>
              <div className="stat-meta">
                <span className="badge badge-primary">Accounts</span>
                <span>Platform operators</span>
              </div>
            </div>

          </div>

          {/* Graphs panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', marginBottom: '32px' }}>
            
            {/* Latency trend chart */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Search Response Latency Timeline (ms)</span>
              </h3>
              {renderLatencyChart(data.search.latency_trend)}
            </div>

            {/* Ingested size metrics */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>Document Storage Metrics</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#0d1321', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Ingested Files:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{data.documents.total_count} files</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#0d1321', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Storage Size:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{formatBytes(data.documents.total_size_bytes)}</span>
                  </div>
                </div>
              </div>

              {/* Type breakdown */}
              {data.documents.by_type.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Format Distribution</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.documents.by_type.map((t, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{t.type.toUpperCase()}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{t.count} files</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${(t.count / data.documents.total_count) * 100}%`, 
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
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <HelpCircle size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Frequently Queried Terms</span>
            </h3>
            {data.search.top_queries.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>No queries audited yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                      <th style={{ padding: '12px 8px' }}>Rank</th>
                      <th style={{ padding: '12px 8px' }}>Query Query Text</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Frequency Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.search.top_queries.map((q, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                        <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>#{idx + 1}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-main)', fontWeight: 500 }}>"{q.query}"</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary)' }}>{q.count} hits</td>
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
