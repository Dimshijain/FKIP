import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import PaginationControls from '../components/PaginationControls';
import { 
  FileText, 
  UploadCloud, 
  Activity, 
  Database, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Brain,
  TrendingUp,
  Cpu,
  RefreshCw,
  Search,
  MessageSquare,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Server,
  ArrowRight,
  Clock
} from 'lucide-react';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [execData, setExecData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const userRole = getUserRole() || 'CONSUMER';
  const toast = useToast();

  const loadDashboardData = async (silent = false) => {
    try {
      const [docs, exec] = await Promise.all([
        api.getDocuments({ useCache: false }),
        api.get('/reports/executive', { useCache: false })
      ]);
      setDocuments(docs || []);
      setExecData(exec);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load initial dashboard metrics:', err);
      if (!silent) {
        toast.error('Failed to fetch dashboard metrics.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshTelemetry = async () => {
    if (isRefreshing) return; // Prevent duplicate requests
    setIsRefreshing(true);
    try {
      api.clearCache();
      const [docs, exec] = await Promise.all([
        api.getDocuments({ useCache: false }),
        api.get('/reports/executive?refresh=true', { useCache: false })
      ]);
      setDocuments(docs || []);
      setExecData(exec);
      setLastRefreshed(new Date());
      toast.success('Telemetry refreshed successfully');
    } catch (err) {
      console.error('Telemetry refresh failed:', err);
      toast.error('Unable to refresh telemetry. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
    const interval = setInterval(() => loadDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (userRole === 'CONSUMER') {
      toast.error('Permissions error: Viewer accounts cannot upload files.');
      return;
    }

    setIsUploading(true);
    try {
      await api.uploadDocument(file);
      toast.success(`File "${file.name}" uploaded successfully. Processing started.`);
      loadDashboardData(true);
    } catch (err) {
      toast.error(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const totalDocs = documents.length;
  const processedDocs = documents.filter(d => d.status === 'COMPLETED').length;
  const aiQueries = execData?.ai_usage?.total_queries || 0;
  const avgLatency = execData?.ai_usage?.average_latency_ms || 0;
  const avgRating = execData?.ai_usage?.average_rating || 0;
  const oppsCount = execData?.innovation?.total_opportunities || 0;
  const activeUsers = execData?.user_activity?.active_users_count || 2;
  const total_ora_metadata = execData?.knowledge_growth?.oracle_objects_count || 0;
  const total_dna_apps = execData?.knowledge_growth?.dna_applications_count || 0;
  const total_dna_features = execData?.knowledge_growth?.dna_features_count || 0;

  const paginatedDocs = documents.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <Cpu size={28} className="page-title-icon" />
              <span>Executive Command Center</span>
            </h1>
            <span className="badge badge-primary">Enterprise v3.2</span>
          </div>
          <p className="page-subtitle">
            Real-time telemetry, knowledge registry growth, and system architecture status across enterprise instances.
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {lastRefreshed && (
            <span style={{ 
              fontSize: '11px', 
              color: 'var(--text-muted)', 
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Clock size={12} style={{ opacity: 0.7 }} />
              <span>Last refreshed: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </span>
          )}
          <button 
            onClick={handleRefreshTelemetry} 
            disabled={isRefreshing}
            className="btn btn-secondary"
            style={{ minWidth: '160px', gap: '8px' }}
            title="Refresh live telemetry, knowledge registry metrics, and system status"
          >
            {isRefreshing ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>Refresh Telemetry</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {isLoading ? (
        <div style={{ marginBottom: 'var(--space-7)' }}>
          <SkeletonCard count={4} />
        </div>
      ) : (
        <div className="stats-grid">
          {/* Knowledge Growth Card */}
          <div className="card stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Knowledge Registry</span>
              <div className="stat-icon-wrapper" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                <FileText size={20} />
              </div>
            </div>
            <div className="stat-value">{totalDocs}</div>
            <div className="stat-meta">
              <span className="badge badge-success">+12%</span>
              <span>{processedDocs} Indexed • {execData?.knowledge_growth?.chunks_count || 0} Chunks</span>
            </div>
          </div>

          {/* AI Copilot Usage Card */}
          <div className="card stat-card">
            <div className="stat-card-header">
              <span className="stat-label">AI Copilot Audits</span>
              <div className="stat-icon-wrapper" style={{ background: 'var(--color-secondary-subtle)', color: 'var(--color-secondary)' }}>
                <Brain size={20} />
              </div>
            </div>
            <div className="stat-value">{aiQueries}</div>
            <div className="stat-meta">
              <span className="badge badge-secondary">{avgLatency}ms</span>
              <span>Rating: {avgRating.toFixed(1)}★ satisfaction</span>
            </div>
          </div>

          {/* Opportunities Metrics Card */}
          <div className="card stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Opportunities Backlog</span>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--color-cyan)' }}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="stat-value">{oppsCount}</div>
            <div className="stat-meta">
              <span className="badge badge-info">Active</span>
              <span>Gaps: {Object.values(execData?.innovation?.status_distribution || {}).reduce((a,b) => a+b, 0)} Logged</span>
            </div>
          </div>

          {/* System Health Card */}
          <div className="card stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Infrastructure Pulse</span>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--status-completed)' }}>
                <Activity size={20} />
              </div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', flexDirection: 'column', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>PG & Redis:</span>
                <span className="badge badge-success">ONLINE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Weaviate DB:</span>
                <span className="badge badge-success">{execData?.system_health?.weaviate?.toUpperCase() || 'HEALTHY'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standardized Tabs Switcher */}
      <div className="tab-nav">
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <Layers size={16} />
          <span>Overview Insights</span>
        </button>
        <button 
          onClick={() => setActiveTab('registry')} 
          className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
        >
          <Database size={16} />
          <span>Knowledge Ingestion Registry ({documents.length})</span>
        </button>
      </div>

      {activeTab === 'overview' ? (
        /* OVERVIEW TAB CONTENT */
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-6)' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="card">
              <div className="section-header">
                <h3 className="section-title">
                  <TrendingUp size={20} className="section-title-icon" />
                  <span>Knowledge Model Distributions</span>
                </h3>
                <span className="badge badge-secondary">Vectorized Index</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                <div className="card-subtle" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>{totalDocs}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>Doc Sources</div>
                </div>
                <div className="card-subtle" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-heading)' }}>{total_ora_metadata}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>Oracle Schemas</div>
                </div>
                <div className="card-subtle" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-secondary)', fontFamily: 'var(--font-heading)' }}>{total_dna_apps}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>Core Systems</div>
                </div>
                <div className="card-subtle" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--status-completed)', fontFamily: 'var(--font-heading)' }}>{total_dna_features}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>Capabilities</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="card">
              <div className="section-header">
                <h3 className="section-title">
                  <Zap size={20} className="section-title-icon" />
                  <span>Executive Quick Launch</span>
                </h3>
                <span className="badge badge-primary">Shortcuts</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
                <a href="/copilot" style={{ textDecoration: 'none' }}>
                  <div className="card-subtle" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Brain size={24} style={{ color: 'var(--color-primary)' }} />
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>AI Copilot</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stream live technical audits with Qwen 2.5</div>
                  </div>
                </a>
                <a href="/sql-writer" style={{ textDecoration: 'none' }}>
                  <div className="card-subtle" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Database size={24} style={{ color: 'var(--color-secondary)' }} />
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>AI SQL Writer</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Schema-aware query drafting & validation</div>
                  </div>
                </a>
                <a href="/docs-generator" style={{ textDecoration: 'none' }}>
                  <div className="card-subtle" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <FileText size={24} style={{ color: 'var(--color-accent)' }} />
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Doc Generator</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Export architecture specs in PDF, Word & MD</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="card">
              <div className="section-header">
                <h3 className="section-title">
                  <Search size={20} className="section-title-icon" />
                  <span>Search Trends Map</span>
                </h3>
              </div>
              
              {(!execData?.user_activity?.top_queries || execData.user_activity.top_queries.length === 0) ? (
                <EmptyState title="No Query Telemetry" description="Submit search queries to view real-time audit trends." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {execData.user_activity.top_queries.map((q, idx) => (
                    <div key={idx} className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={q.query}>
                        "{q.query}"
                      </span>
                      <span className="badge badge-primary">
                        {q.count} audits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-header">
                <h3 className="section-title">
                  <MessageSquare size={20} className="section-title-icon" />
                  <span>Platform Operators</span>
                </h3>
              </div>
              <div style={{ padding: 'var(--space-4) 0', textAlign: 'center' }}>
                <div style={{ fontSize: '38px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>{activeUsers}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Active operators actively auditing enterprise assets</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* REGISTRY TAB CONTENT */
        <div>
          {userRole !== 'CONSUMER' && (
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="section-header">
                <h2 className="section-title">
                  <UploadCloud size={20} className="section-title-icon" />
                  <span>Ingest Knowledge Files</span>
                </h2>
              </div>
              <label 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '36px var(--space-6)', 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--card-subtle-bg)',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  type="file" 
                  accept=".pdf,.txt,.docx,.csv" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={36} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Uploading files and submitting to queue...</span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                      <UploadCloud size={26} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Click to browse or drop files to upload</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Supported formats: PDF, TXT, DOCX, CSV (Max size: 50MB)</div>
                  </div>
                )}
              </label>
            </div>
          )}

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Knowledge Ingestion Logs</h2>
              <span className="badge badge-secondary">{documents.length} Total Files</span>
            </div>
            
            {documents.length === 0 ? (
              <div style={{ padding: '24px' }}>
                <EmptyState title="No Knowledge Assets Ingested" description="Upload PDF, TXT, or DOCX files above to populate the semantic index." />
              </div>
            ) : (
              <div>
                <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Uploader</th>
                        <th>Status</th>
                        <th>Uploaded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDocs.map((doc) => (
                        <tr key={doc.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{doc.filename}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{(doc.file_size_bytes / 1024).toFixed(1)} KB</td>
                          <td><span className="badge badge-primary">{doc.file_type}</span></td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{doc.author || 'system'}</td>
                          <td>
                            <span className={`badge badge-${doc.status === 'COMPLETED' ? 'success' : doc.status === 'FAILED' ? 'danger' : 'warning'}`}>
                              {doc.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-dark)', fontSize: '13px' }}>
                            {new Date(doc.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={page}
                  totalItems={documents.length}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(p)}
                  onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
