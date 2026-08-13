import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import PaginationControls from '../components/PaginationControls';
import { 
  Database, 
  Upload, 
  Play, 
  AlertTriangle, 
  ArrowRight, 
  FileText,
  Activity,
  Layers,
  Search,
  Filter,
  Eye,
  X,
  CheckCircle2
} from 'lucide-react';

export default function OracleIntelligence() {
  const [objects, setObjects] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [impactResults, setImpactResults] = useState([]);
  const [activeTab, setActiveTab] = useState('schema');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [activeModalObject, setActiveModalObject] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: '', msg: '' });
  const toast = useToast();
  const fileInputRef = useRef(null);
  const mermaidRef = useRef(null);

  useEffect(() => {
    fetchSchemaData();
    loadMermaidCDN();
  }, []);

  const loadMermaidCDN = () => {
    if (!window.mermaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.async = true;
      script.onload = () => {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
        });
        renderErDiagram();
      };
      document.body.appendChild(script);
    }
  };

  const fetchSchemaData = async () => {
    try {
      const [objData, depData] = await Promise.all([
        api.get('/oracle/objects'),
        api.get('/oracle/dependencies')
      ]);
      setObjects(objData || []);
      setDependencies(depData || []);
    } catch (err) {
      console.error("Failed to load Oracle metadata", err);
    } finally {
      setIsLoading(false);
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
      const res = await api.postMultipart('/oracle/upload', formData);
      setUploadStatus({ 
        type: 'success', 
        msg: `Successfully parsed DDL! Indexed ${res.objects_created} objects and ${res.relationships_created} dependencies.` 
      });
      toast.success('Oracle DDL parsed & dependencies indexed.');
      fetchSchemaData();
    } catch (err) {
      const errDetail = err.response?.data?.detail || err.message || "Failed to process Oracle DDL file.";
      setUploadStatus({ 
        type: 'error', 
        msg: errDetail 
      });
      toast.error(errDetail);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerImpactAnalysis = async (obj) => {
    setSelectedObject(obj);
    try {
      const results = await api.get(`/oracle/impact-analysis?object_id=${obj.id}`, { useCache: false });
      setImpactResults(results || []);
      setActiveTab('impact');
      toast.info(`Traced impact for ${obj.object_name}.`);
    } catch (err) {
      console.error("Impact analysis failed", err);
      toast.error("Failed to execute impact analysis.");
    }
  };

  const renderErDiagram = () => {
    if (!window.mermaid || !mermaidRef.current) return;
    
    const tables = objects.filter(o => o.object_type === 'TABLE');
    if (tables.length === 0) {
      mermaidRef.current.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No schemas parsed yet. Upload an Oracle DDL file to generate diagram.</div>`;
      return;
    }

    let graphDefinition = 'erDiagram\n';
    
    tables.forEach(t => {
      graphDefinition += `    ${t.object_name} {\n        varchar object_type\n    }\n`;
    });

    dependencies.forEach(d => {
      if (d.dep_type === 'FOREIGN_KEY') {
        const sourceObj = objects.find(o => o.id === d.source_object_id);
        const targetObj = objects.find(o => o.id === d.target_object_id);
        if (sourceObj && targetObj) {
          graphDefinition += `    ${targetObj.object_name} ||--o{ ${sourceObj.object_name} : "FK"\n`;
        }
      }
    });

    try {
      mermaidRef.current.removeAttribute('data-processed');
      window.mermaid.render('mermaid-svg', graphDefinition).then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      }).catch(err => {
        console.error("Mermaid render failed", err);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<div style="color: var(--status-failed); padding: 20px;">Mermaid render failed. Check syntax.</div>`;
        }
      });
    } catch (err) {
      console.error("Mermaid parsing failed", err);
      mermaidRef.current.innerHTML = `<div style="color: var(--status-failed);">Mermaid render error. Table definitions incomplete.</div>`;
    }
  };

  useEffect(() => {
    if (activeTab === 'er') {
      setTimeout(renderErDiagram, 100);
    }
  }, [activeTab, objects, dependencies]);

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <Database size={28} className="page-title-icon" />
              <span>Oracle Database Intelligence</span>
            </h1>
            <span className="badge badge-primary">DDL & Impact</span>
          </div>
          <p className="page-subtitle">
            Extract constraints, view structures, and triggers. Compute down-stream application impacts of column updates.
          </p>
        </div>
        
        {/* Upload Button */}
        <div className="page-actions">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            accept=".sql,.txt,.ddl"
          />
          <button 
            onClick={() => fileInputRef.current.click()} 
            disabled={isUploading}
            className="btn btn-primary"
          >
            <Upload size={16} />
            <span>{isUploading ? 'Parsing Schema...' : 'Upload Oracle DDL'}</span>
          </button>
        </div>
      </div>

      {/* Standardized Alert banner */}
      {uploadStatus.msg && (
        <div className={`alert-banner ${uploadStatus.type === 'success' ? 'alert-banner-success' : 'alert-banner-error'}`}>
          {uploadStatus.msg}
        </div>
      )}

      {/* Standardized Navigation tabs */}
      <div className="tab-nav">
        <button 
          onClick={() => setActiveTab('schema')}
          className={`tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
        >
          <Database size={15} />
          <span>Schema Objects ({objects.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('er')}
          className={`tab-btn ${activeTab === 'er' ? 'active' : ''}`}
        >
          <Layers size={15} />
          <span>Visual ER Diagram</span>
        </button>
        <button 
          onClick={() => setActiveTab('impact')}
          className={`tab-btn ${activeTab === 'impact' ? 'active' : ''}`}
        >
          <Activity size={15} />
          <span>Change Impact Simulation</span>
        </button>
      </div>

      {/* Workspace Body */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {activeTab === 'schema' && (
          <div style={{ padding: 'var(--space-6)' }}>
            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['ALL', 'TABLE', 'VIEW', 'PACKAGE', 'PROCEDURE', 'TRIGGER'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTypeFilter(t); setPage(1); }}
                    className={`badge ${typeFilter === t ? 'badge-primary' : 'badge-secondary'}`}
                    style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="search-input-group" style={{ width: '280px' }}>
                <Search size={14} className="search-input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter objects by name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>
            </div>

            {isLoading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : (() => {
              const filtered = objects.filter(obj => {
                const matchType = typeFilter === 'ALL' || obj.object_type === typeFilter;
                const matchSearch = obj.object_name.toLowerCase().includes(searchQuery.toLowerCase()) || obj.owner.toLowerCase().includes(searchQuery.toLowerCase());
                return matchType && matchSearch;
              });

              const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

              if (filtered.length === 0) {
                return <EmptyState icon={Database} title="No Oracle Objects Discovered" description="Upload DDL files or adjust search filters to view schema objects." />;
              }

              return (
                <div>
                  <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
                    <table className="table-modern">
                      <thead>
                        <tr>
                          <th>Object Name</th>
                          <th>Type</th>
                          <th>Owner</th>
                          <th>References</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(obj => {
                          const depsCount = dependencies.filter(d => d.source_object_id === obj.id).length;
                          return (
                            <tr key={obj.id}>
                              <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{obj.object_name}</td>
                              <td><span className="badge badge-info">{obj.object_type}</span></td>
                              <td style={{ color: 'var(--text-muted)' }}>{obj.owner}</td>
                              <td><span className="badge badge-secondary">{depsCount} Downstream</span></td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button 
                                    onClick={() => setActiveModalObject(obj)}
                                    className="btn btn-secondary btn-sm"
                                    title="Inspect DDL"
                                  >
                                    <Eye size={13} />
                                    <span>Inspect</span>
                                  </button>
                                  <button 
                                    onClick={() => triggerImpactAnalysis(obj)}
                                    className="btn btn-primary btn-sm"
                                  >
                                    <Play size={12} />
                                    <span>Trace Impact</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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

        {activeTab === 'er' && (
          <div style={{ padding: 'var(--space-6)' }}>
            <div className="section-header">
              <h3 className="section-title">
                <Layers size={18} className="section-title-icon" />
                <span>Visual Entity Relationship Modeler</span>
              </h3>
            </div>
            <div 
              ref={mermaidRef} 
              className="mermaid" 
              style={{ 
                background: 'var(--bg-input)', 
                padding: '32px', 
                borderRadius: 'var(--radius-lg)', 
                minHeight: '360px',
                display: 'flex',
                justifyContent: 'center',
                overflowX: 'auto',
                border: '1px solid var(--border-color)'
              }}
            >
              Loading diagram render engine...
            </div>
          </div>
        )}

        {activeTab === 'impact' && (
          <div style={{ padding: 'var(--space-6)' }}>
            {!selectedObject ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Activity size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto', color: 'var(--color-primary)' }} />
                <h3 style={{ color: 'var(--text-main)', marginBottom: '6px' }}>No Trace Object Selected</h3>
                <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>Select a table or view in the Schema Objects catalog and click "Trace Impact" to map dependencies.</p>
              </div>
            ) : (
              <div>
                <div className="card-subtle" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'var(--space-5)' }}>
                  <div style={{ background: 'var(--color-primary-subtle)', borderRadius: 'var(--radius-md)', padding: '12px', color: 'var(--color-primary)', display: 'flex' }}>
                    <Database size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)', textTransform: 'uppercase', fontWeight: 700 }}>Tracing Source</span>
                    <h3 style={{ color: 'var(--text-main)', fontSize: '18px' }}>
                      {selectedObject.object_name} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-muted)' }}>({selectedObject.object_type})</span>
                    </h3>
                  </div>
                </div>

                <div className="section-header">
                  <h4 className="section-title" style={{ fontSize: '16px' }}>
                    Downstream Affected Objects ({impactResults.length})
                  </h4>
                </div>

                {impactResults.length === 0 ? (
                  <div className="alert-banner alert-banner-success">
                    <CheckCircle2 size={18} />
                    <span>No cascading impact found. Modifying this table will not break any downstream views, procedures, or triggers.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {impactResults.map((item) => {
                      const isBroken = item.is_broken || item.status === 'BROKEN_REFERENCE';
                      const statusText = item.status_label || (isBroken ? 'Broken reference risk' : 'Valid reference');

                      return (
                        <div key={item.id} className="card-subtle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              background: isBroken ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-primary-subtle)', 
                              color: isBroken ? 'var(--status-failed)' : 'var(--color-primary)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700
                            }}>
                              {item.depth}
                            </span>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>{item.object_name}</span>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span>Type: <strong>{item.object_type}</strong></span>
                                <span>•</span>
                                <span>Cause: <strong>{item.dep_type}</strong></span>
                                {item.risk_level && (
                                  <>
                                    <span>•</span>
                                    <span>Risk: <span style={{ color: isBroken ? 'var(--status-failed)' : 'var(--text-muted)', fontWeight: 600 }}>{item.risk_level}</span></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {isBroken ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-failed)', fontSize: '13px', fontWeight: 600 }}>
                              <AlertTriangle size={15} />
                              <span>{statusText}</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-completed)', fontSize: '13px', fontWeight: 600 }}>
                              <CheckCircle2 size={15} />
                              <span>{statusText}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inspect Object Modal Drawer */}
      {activeModalObject && (
        <div className="modal-overlay" onClick={() => setActiveModalObject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{activeModalObject.object_name}</h3>
              </div>
              <button onClick={() => setActiveModalObject(null)} className="btn-icon btn-icon-sm">
                <X size={16} />
              </button>
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <span className="badge badge-info">{activeModalObject.object_type}</span>
              <span className="badge badge-primary">Owner: {activeModalObject.owner}</span>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontFamily: 'var(--font-mono)', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
              {activeModalObject.ddl_script || `-- DDL Specification for ${activeModalObject.object_name}\nCREATE ${activeModalObject.object_type} ${activeModalObject.owner}.${activeModalObject.object_name} (\n  id NUMBER PRIMARY KEY,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModalObject(null)} className="btn btn-secondary">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
