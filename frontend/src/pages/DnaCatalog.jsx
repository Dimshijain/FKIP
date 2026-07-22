import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  AppWindow, 
  Upload, 
  Layers, 
  Sliders, 
  FileJson, 
  TrendingUp, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function DnaCatalog() {
  const [apps, setApps] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [threshold, setThreshold] = useState(0.80);
  const [uploadStatus, setUploadStatus] = useState({ type: '', msg: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'clusters'
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
      setApps(appData);
    } catch (err) {
      console.error("Failed to load Core Banking applications", err);
    }
  };

  const fetchClusters = async () => {
    try {
      const clusterData = await api.get(`/dna/clusters?threshold=${threshold}`);
      setClusters(clusterData);
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
      fetchCatalogData();
      if (activeTab === 'clusters') {
        fetchClusters();
      }
    } catch (err) {
      setUploadStatus({
        type: 'error',
        msg: err.response?.data?.detail || "Failed to process Core Banking applications file."
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="workspace-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AppWindow size={32} style={{ color: 'var(--color-primary)' }} />
            <span>Core Banking Application Catalog</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Audit internal features and services. Calculate semantic similarity to uncover duplicate capabilities and platform redundancies.
          </p>
        </div>
        
        {/* Upload Trigger */}
        <div>
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
            style={{ gap: '8px' }}
          >
            <Upload size={16} />
            <span>{isUploading ? 'Ingesting specs...' : 'Ingest Application Spec'}</span>
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {uploadStatus.msg && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: uploadStatus.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: uploadStatus.type === 'success' ? 'var(--status-completed)' : 'var(--status-failed)',
          border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          {uploadStatus.msg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '24px' }}>
        <button 
          onClick={() => setActiveTab('catalog')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'catalog' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'catalog' ? '2px solid var(--color-primary)' : 'none',
            padding: '12px 4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '15px'
          }}
        >
          Systems catalog ({apps.length})
        </button>
        <button 
          onClick={() => setActiveTab('clusters')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'clusters' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'clusters' ? '2px solid var(--color-primary)' : 'none',
            padding: '12px 4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '15px'
          }}
        >
          Capability redundancy grouping
        </button>
      </div>

      {/* Dynamic Body */}
      <div className="card" style={{ padding: '24px' }}>
        {activeTab === 'catalog' && (
          <div>
            {apps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <FileJson size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <h3>No indexed applications found</h3>
                <p>Ingest a Core Banking catalog JSON or CSV specifying application metrics and functional scopes.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {apps.map(app => (
                  <div key={app.id} style={{ 
                    padding: '20px', 
                    borderRadius: '8px', 
                    background: '#0d1321', 
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{app.app_code}</span>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-muted)'
                        }}>
                          {app.platform}
                        </span>
                      </div>
                      <h3 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '18px' }}>{app.app_name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.4', marginBottom: '16px' }}>{app.description}</p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Owner: {app.owner}</span>
                      <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{app.features.length} Features</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'clusters' && (
          <div>
            {/* Control Panel (Sensitivity Slider) */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '24px', 
              background: '#0d1321', 
              padding: '16px 24px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              marginBottom: '24px'
            }}>
              <Sliders size={20} style={{ color: 'var(--color-primary)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Vector Matching Sensitivity</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{Math.round(threshold * 100)}% Match</span>
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
                <CheckCircle size={48} style={{ opacity: 0.2, marginBottom: '16px', color: 'var(--status-completed)' }} />
                <h3>No duplicate capabilities detected</h3>
                <p>Clean system state! No applications share features matching this similarity threshold.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {clusters.map(cluster => (
                  <div key={cluster.cluster_id} style={{ 
                    padding: '24px', 
                    borderRadius: '8px', 
                    background: '#0d1321', 
                    border: '1px solid var(--border-color)' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold' }}>{cluster.cluster_id}</span>
                        <h3 style={{ color: 'var(--text-main)', marginTop: '4px' }}>Capability: {cluster.primary_capability}</h3>
                      </div>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--status-failed)',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <AlertCircle size={14} />
                        <span>Redundancy Warning ({cluster.features.length} Apps)</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {cluster.features.map((feat, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '12px 16px', 
                          background: idx === 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.01)', 
                          borderRadius: '6px',
                          border: idx === 0 ? '1px solid rgba(59, 130, 246, 0.1)' : '1px solid transparent'
                        }}>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {idx === 0 ? 'Primary Reference Source' : `Redundant Footprint Match`}
                            </span>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px', marginTop: '2px' }}>
                              {feat.feature_name} — <span style={{ color: 'var(--color-primary)' }}>{feat.app_name} ({feat.app_code})</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{feat.feature_description}</p>
                          </div>
                          
                          {idx > 0 && (
                            <span style={{ 
                              color: 'var(--status-failed)', 
                              fontWeight: 'bold', 
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <TrendingUp size={14} />
                              <span>{Math.round(feat.similarity_score * 100)}% match</span>
                            </span>
                          )}
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
    </div>
  );
}
