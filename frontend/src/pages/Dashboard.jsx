import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
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
  MessageSquare
} from 'lucide-react';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [execData, setExecData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'registry'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const userRole = getUserRole() || 'CONSUMER';

  const loadDashboardData = async () => {
    try {
      setError('');
      // Parallel fetches
      const [docs, exec] = await Promise.all([
        api.getDocuments(),
        api.get('/reports/executive')
      ]);
      setDocuments(docs);
      setExecData(exec);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch executive dashboard metrics. Please verify API is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (userRole === 'CONSUMER') {
      setError('Permissions error: Viewer accounts cannot upload files.');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      await api.uploadDocument(file);
      setSuccess(`File "${file.name}" uploaded successfully. Processing started in background.`);
      loadDashboardData();
    } catch (err) {
      setError(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Base metrics fallback
  const totalDocs = documents.length;
  const processedDocs = documents.filter(d => d.status === 'COMPLETED').length;
  const processingDocs = documents.filter(d => d.status === 'PROCESSING' || d.status === 'PENDING').length;
  const failedDocs = documents.filter(d => d.status === 'FAILED').length;

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Executive Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}> FKIP Platform command center displaying system intelligence metrics, growth telemetry, and knowledge files.</p>
        </div>
        <button onClick={loadDashboardData} className="btn btn-secondary" style={{ gap: '8px' }}>
          <RefreshCw size={16} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: 'var(--status-failed)', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '32px',
          fontSize: '14px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(16, 185, 129, 0.1)', 
          color: 'var(--status-completed)', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '32px',
          fontSize: '14px',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {/* Knowledge Growth Card */}
        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Knowledge Registry</span>
            <FileText size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="stat-value">{totalDocs}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {processedDocs} Indexed • {execData?.knowledge_growth?.chunks_count || 0} Text Chunks
          </div>
        </div>

        {/* AI Copilot Usage Card */}
        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">AI Copilot Audits</span>
            <Brain size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="stat-value">{aiQueries}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Avg Latency: {avgLatency}ms • Rating: {avgRating.toFixed(1)}★
          </div>
        </div>

        {/* Innovation Metrics Card */}
        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Opportunities Backlog</span>
            <TrendingUp size={20} style={{ color: 'var(--color-secondary)' }} />
          </div>
          <div className="stat-value">{oppsCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Active Gaps: {Object.values(execData?.innovation?.status_distribution || {}).reduce((a,b) => a+b, 0)} Items
          </div>
        </div>

        {/* Infrastructure System Health Card */}
        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Infrastructure Pulse</span>
            <Activity size={20} style={{ color: 'var(--status-completed)' }} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', flexDirection: 'column', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>PG DB:</span>
              <span style={{ color: 'var(--status-completed)' }}>{execData?.system_health?.postgres || 'ONLINE'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Weaviate:</span>
              <span style={{ color: execData?.system_health?.weaviate === 'healthy' ? 'var(--status-completed)' : 'var(--status-failed)' }}>
                {execData?.system_health?.weaviate?.toUpperCase() || 'ONLINE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CPU/Mem:</span>
              <span style={{ color: 'var(--text-main)' }}>{cpuPercent}% / {memPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px' }}>
        <button 
          onClick={() => setActiveTab('overview')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'overview' ? 'var(--text-main)' : 'var(--text-muted)',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '15px'
          }}
        >
          Overview Insights
        </button>
        <button 
          onClick={() => setActiveTab('registry')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'registry' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'registry' ? 'var(--text-main)' : 'var(--text-muted)',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '15px'
          }}
        >
          Knowledge Ingestion Registry
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : activeTab === 'overview' ? (
        /* OVERVIEW TAB CONTENT */
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
          {/* Left Column: Charts and Telemetries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Knowledge Model Distributions</span>
              </h3>
              
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-around', padding: '20px 0' }}>
                {/* Oracle metadata */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-secondary)' }}>{totalDocs}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Doc Sources</div>
                </div>
                {/* Oracle Objects */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-accent)' }}>{total_ora_metadata}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Oracle Schemas</div>
                </div>
                {/* Core Banking Applications */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>{total_dna_apps}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Core Banking Systems</div>
                </div>
                {/* Core Banking Features */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--status-completed)' }}>{total_dna_features}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Core Banking Capabilities</div>
                </div>
              </div>
            </div>


          </div>

          {/* Right Column: Search trends and active users */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Search Trends Card */}
            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} style={{ color: 'var(--color-secondary)' }} />
                <span>Search Trends Map</span>
              </h3>
              
              {(!execData?.user_activity?.top_queries || execData.user_activity.top_queries.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No searches recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {execData.user_activity.top_queries.map((q, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={q.query}>
                        "{q.query}"
                      </span>
                      <span style={{ background: 'var(--bg-input)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        {q.count} audits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Access Summary */}
            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} style={{ color: 'var(--color-accent)' }} />
                <span>User Activity</span>
              </h3>
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-accent)' }}>{activeUsers}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Active platform operators auditing assets</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* REGISTRY TAB CONTENT (Preserving Phase 1/2 document upload & Logs) */
        <div>
          {userRole !== 'CONSUMER' && (
            <div className="card" style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Ingest Knowledge Files</h2>
              <label className="upload-zone">
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
                  <div>
                    <UploadCloud size={48} className="upload-icon" />
                    <div className="upload-text">Click to browse or drop files to upload</div>
                    <div className="upload-hint">Supported file formats: PDF, TXT, DOCX, CSV (Max size: 50MB)</div>
                  </div>
                )}
              </label>
            </div>
          )}

          <div className="card">
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Knowledge Ingestion Logs</h2>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto' }} />
                <p>No documents found in the database. Please upload knowledge assets to begin indexing.</p>
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
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
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 600 }}>{doc.filename}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{(doc.file_size_bytes / 1024).toFixed(1)} KB</td>
                        <td><span style={{ textTransform: 'uppercase', fontSize: '12px' }}>{doc.file_type}</span></td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{doc.author || 'system'}</td>
                        <td>
                          <span className={`badge badge-${doc.status.toLowerCase()}`}>
                            {doc.status}
                          </span>
                          {doc.error_message && (
                            <div style={{ color: 'var(--status-failed)', fontSize: '11px', marginTop: '4px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.error_message}>
                              Error: {doc.error_message}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-dark)', fontSize: '13px' }}>
                          {new Date(doc.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
