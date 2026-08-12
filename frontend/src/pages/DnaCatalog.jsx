import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import PaginationControls from '../components/PaginationControls';
import { 
  AppWindow, 
  Upload, 
  Layers, 
  Sliders, 
  FileJson, 
  TrendingUp, 
  CheckCircle,
  AlertCircle,
  Search,
  Eye,
  X,
  Code,
  ShieldCheck
} from 'lucide-react';

export default function DnaCatalog() {
  const [apps, setApps] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [threshold, setThreshold] = useState(0.80);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [activeModalApp, setActiveModalApp] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: '', msg: '' });
  const toast = useToast();
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCatalogData();
  }, []);

  useEffect(() => {
    if (activeTab === 'clusters') {
      fetchClusters();
    }
  }, [threshold, activeTab]);

  const fetchCatalogData = async () => {
    try {
      const appData = await api.get('/dna/apps');
      setApps(appData || []);
    } catch (err) {
      console.error("Failed to load Core Banking applications", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClusters = async () => {
    try {
      const clusterData = await api.get(`/dna/clusters?threshold=${threshold}`);
      setClusters(clusterData || []);
    } catch (err) {
      console.error("Failed to fetch Core Banking clusters", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: '', msg: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.postMultipart('/dna/upload', formData);
      setUploadStatus({
        type: 'success',
        msg: `Catalog processed! Successfully ingested specifications with ${res.features_indexed} indexed features.`
      });
      toast.success('Core banking application specification indexed.');
      fetchCatalogData();
      if (activeTab === 'clusters') {
        fetchClusters();
      }
    } catch (err) {
      const errDetail = err.response?.data?.detail || err.message || "Failed to process Core Banking applications file.";
      setUploadStatus({
        type: 'error',
        msg: errDetail
      });
      toast.error(errDetail);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <AppWindow size={28} className="page-title-icon" />
              <span>Core Banking Application Catalog</span>
            </h1>
            <span className="badge badge-primary">Redundancy Audit</span>
          </div>
          <p className="page-subtitle">
            Audit internal features and services. Calculate semantic similarity to uncover duplicate capabilities and platform redundancies.
          </p>
        </div>
        
        {/* Upload Trigger */}
        <div className="page-actions">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            accept=".json,.csv"
          />
          <button 
            onClick={() => fileInputRef.current.click()} 
            disabled={isUploading}
            className="btn btn-primary"
          >
            <Upload size={16} />
            <span>{isUploading ? 'Ingesting specs...' : 'Ingest Application Spec'}</span>
          </button>
        </div>
      </div>

      {/* Standardized Alert banner */}
      {uploadStatus.msg && (
        <div className={`alert-banner ${uploadStatus.type === 'success' ? 'alert-banner-success' : 'alert-banner-error'}`}>
          {uploadStatus.msg}
        </div>
      )}

      {/* Standardized Navigation Tabs */}
      <div className="tab-nav">
        <button 
          onClick={() => setActiveTab('catalog')}
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
        >
          <AppWindow size={15} />
          <span>Systems Catalog ({apps.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('clusters')}
          className={`tab-btn ${activeTab === 'clusters' ? 'active' : ''}`}
        >
          <Sliders size={15} />
          <span>Capability Redundancy Grouping</span>
        </button>
      </div>

      {/* Dynamic Body */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        {activeTab === 'catalog' && (
          <div>
            {/* Search Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: '16px' }}>
              <div className="search-input-group" style={{ width: '320px' }}>
                <Search size={14} className="search-input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search application name or code..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  style={{ height: '38px', fontSize: '13px' }}
                />
              </div>
              <span className="badge badge-secondary">{apps.length} Total Systems</span>
            </div>

            {isLoading ? (
              <SkeletonCard count={3} />
            ) : (() => {
              const filtered = apps.filter(app => 
                app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.app_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.description.toLowerCase().includes(searchQuery.toLowerCase())
              );

              const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

              if (filtered.length === 0) {
                return <EmptyState icon={AppWindow} title="No Applications Found" description="Upload Core Banking catalog JSON or adjust your search filter." />;
              }

              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
                    {paginated.map(app => (
                      <div key={app.id} className="card-subtle" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--color-primary)' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span className="badge badge-primary">{app.app_code}</span>
                            <span className="badge badge-secondary">{app.platform}</span>
                          </div>
                          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '17px', fontWeight: 700 }}>{app.app_name}</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{app.description}</p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Owner: <strong style={{ color: 'var(--text-main)' }}>{app.owner}</strong></span>
                          <button 
                            onClick={() => setActiveModalApp(app)}
                            className="btn btn-secondary btn-sm"
                          >
                            <Eye size={13} />
                            <span>{app.features?.length || 0} Features</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <PaginationControls
                    currentPage={page}
                    totalItems={filtered.length}
                    pageSize={pageSize}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'clusters' && (
          <div>
            {/* Control Panel (Sensitivity Slider) */}
            <div className="card-subtle" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '24px', 
              padding: '16px 24px', 
              marginBottom: 'var(--space-6)'
            }}>
              <Sliders size={22} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Vector Matching Sensitivity Threshold</span>
                  <span className="badge badge-primary">{Math.round(threshold * 100)}% Match</span>
                </div>
                <input 
                  type="range" 
                  min="0.50" 
                  max="1.00" 
                  step="0.05"
                  value={threshold} 
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Clusters List */}
            {clusters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto', color: 'var(--status-completed)' }} />
                <h3 style={{ color: 'var(--text-main)', marginBottom: '6px' }}>No Duplicate Capabilities Detected</h3>
                <p style={{ fontSize: '14px', maxWidth: '440px', margin: '0 auto' }}>Clean system state! No applications share features matching this similarity threshold.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {clusters.map(cluster => (
                  <div key={cluster.cluster_id} className="card-subtle" style={{ padding: 'var(--space-5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase' }}>{cluster.cluster_id}</span>
                        <h3 style={{ color: 'var(--text-main)', fontSize: '17px', fontWeight: 700, marginTop: '2px' }}>Capability: {cluster.primary_capability}</h3>
                      </div>
                      <span className="badge badge-danger">
                        <AlertCircle size={14} />
                        <span>Redundancy Warning ({cluster.features?.length || 0} Apps)</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {cluster.features?.map((feat, idx) => (
                        <div key={idx} className="card-subtle" style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 16px',
                          background: 'var(--bg-input)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="badge badge-primary">{feat.app_code}</span>
                            <div>
                              <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{feat.feature_name}</strong>
                              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{feat.description}</p>
                            </div>
                          </div>
                          <span className="badge badge-success">
                            {feat.similarity ? `${Math.round(feat.similarity * 100)}% Match` : 'Cluster Member'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inspect App Modal Drawer */}
      {activeModalApp && (
        <div className="modal-overlay" onClick={() => setActiveModalApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AppWindow size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{activeModalApp.app_name}</h3>
              </div>
              <button onClick={() => setActiveModalApp(null)} className="btn-icon btn-icon-sm">
                <X size={16} />
              </button>
            </div>
            
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <span className="badge badge-primary">{activeModalApp.app_code}</span>
              <span className="badge badge-secondary">{activeModalApp.platform}</span>
              <span className="badge badge-info">Owner: {activeModalApp.owner}</span>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
              {activeModalApp.description}
            </p>

            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
              Registered Application Features ({activeModalApp.features?.length || 0})
            </h4>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeModalApp.features?.map((f, i) => (
                <div key={i} className="card-subtle" style={{ padding: '12px 14px', background: 'var(--bg-input)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>{f.feature_name}</span>
                    <span className="badge badge-secondary" style={{ fontSize: '10px' }}>{f.feature_code || `FEAT-${i+1}`}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.description}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModalApp(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
