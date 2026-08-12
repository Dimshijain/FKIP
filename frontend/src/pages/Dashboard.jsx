import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard } from '../components/SkeletonLoader';
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
  Server
} from 'lucide-react';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [execData, setExecData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const userRole = getUserRole() || 'CONSUMER';
  const toast = useToast();

  const loadDashboardData = async (showToast = false) => {
    try {
      const [docs, exec] = await Promise.all([
        api.getDocuments(),
        api.get('/reports/executive')
      ]);
      setDocuments(docs);
      setExecData(exec);
      if (showToast) {
        toast.success('Executive dashboard metrics refreshed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => loadDashboardData(false), 15000);
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
      loadDashboardData();
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
  const activeUsers = execData?.user_activity?.active_users_count || 0;
  const cpuPercent = execData?.system_health?.cpu_percent || 0.0;
  const memPercent = execData?.system_health?.memory_percent || 0.0;
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
            <h1 className="page-title">Executive Command Center</h1>
            <span className="badge badge-primary">Enterprise v3.2</span>
          </div>
          <p className="page-subtitle">Real-time telemetry, knowledge registry growth, and system architecture status.</p>
        </div>
        <div className="page-actions">
          <button onClick={() => loadDashboardData(true)} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {isLoading ? (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <SkeletonCard count={4} />
        </div>
      ) : (
        <div className="stats-grid">
          {/* Knowledge Growth Card */}
          <div className="card stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Knowledge Registry</span>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)' }}>
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
              <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-accent)' }}>
                <Brain size={20} />
              </div>
            </div>
            <div className="stat-value">{aiQueries}</div>
            <div className="stat-meta">
              <span className="badge badge-secondary">{avgLatency}ms</span>
              <span>Rating: {avgRating.toFixed(1)}★</span>
            </div>
          </div>

          {/* Opportunities Metrics Card */}
          <div className="card stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Opportunities Backlog</span>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-secondary)' }}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="stat-value">{oppsCount}</div>
            <div className="stat-meta">
              <span className="badge badge-info">Active</span>
              <span>Gaps: {Object.values(execData?.innovation?.status_distribution || {}).reduce((a,b) => a+b, 0)} Items</span>
            </div>
          </div>

          {/* System Health Card */}
          <div className="card stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Infrastructure Pulse</span>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-completed)' }}>
                <Activity size={20} />
              </div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', flexDirection: 'column', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>PG & Redis:</span>
                <span className="badge badge-success">ONLINE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Weaviate DB:</span>
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
          Overview Insights
        </button>
        <button 
          onClick={() => setActiveTab('registry')} 
          className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
        >
          Knowledge Ingestion Registry
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px 0' }}>
          <SkeletonCard count={2} />
        </div>
      ) : activeTab === 'overview' ? (
        /* OVERVIEW TAB CONTENT */
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Knowledge Model Distributions</span>
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textOverflow: 'ellipsis' }}>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-secondary)' }}>{totalDocs}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Doc Sources</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-accent)' }}>{total_ora_metadata}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Oracle Schemas</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>{total_dna_apps}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Core Systems</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--status-completed)' }}>{total_dna_features}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Capabilities</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: 'var(--color-secondary)' }} />
                <span>Executive Quick Launch</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <a href="/copilot" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '16px', cursor: 'pointer', height: '100%' }}>
                    <Brain size={24} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>AI Copilot</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Stream live technical audits</div>
                  </div>
                </a>
                <a href="/sql-writer" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '16px', cursor: 'pointer', height: '100%' }}>
                    <Database size={24} style={{ color: 'var(--color-secondary)', marginBottom: '8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>AI SQL Writer</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Schema-aware query drafting</div>
                  </div>
                </a>
                <a href="/docs-generator" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '16px', cursor: 'pointer', height: '100%' }}>
                    <FileText size={24} style={{ color: 'var(--color-accent)', marginBottom: '8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Doc Generator</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Export PDF, Word & MD</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} style={{ color: 'var(--color-secondary)' }} />
                <span>Search Trends Map</span>
              </h3>
              
              {(!execData?.user_activity?.top_queries || execData.user_activity.top_queries.length === 0) ? (
                <EmptyState title="No Query Telemetry" description="Submit search queries to view real-time audit trends." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {execData.user_activity.top_queries.map((q, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={q.query}>
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
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} style={{ color: 'var(--color-accent)' }} />
                <span>User Activity</span>
              </h3>
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-accent)' }}>{activeUsers}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Active platform operators auditing assets</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* REGISTRY TAB CONTENT */
        <div>
          {userRole !== 'CONSUMER' && (
            <div className="card" style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Ingest Knowledge Files</h2>
              <label className="upload-zone" style={{ border: '2px dashed var(--color-primary)', borderRadius: '12px', padding: '32px', textDecoration: 'none' }}>
                <input 
                  type="file" 
                  accept=".pdf,.txt,.docx,.csv" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
                    <span className="upload-text">Uploading files and submitting to queue...</span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <UploadCloud size={48} className="upload-icon" style={{ color: 'var(--color-primary)', margin: '0 auto 12px auto' }} />
                    <div className="upload-text" style={{ fontSize: '16px', fontWeight: 600 }}>Click to browse or drop files to upload</div>
                    <div className="upload-hint" style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Supported formats: PDF, TXT, DOCX, CSV (Max size: 50MB)</div>
                  </div>
                )}
              </label>
            </div>
          )}

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px' }}>Knowledge Ingestion Logs</h2>
              <span className="badge badge-secondary">{documents.length} Total Files</span>
            </div>
            
            {documents.length === 0 ? (
              <EmptyState title="No Knowledge Assets Ingested" description="Upload PDF, TXT, or DOCX files above to populate the semantic index." />
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
                          <td style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{doc.filename}</td>
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
