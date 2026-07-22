import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  Database, 
  Upload, 
  Play, 
  AlertTriangle, 
  ArrowRight, 
  FileText,
  Activity,
  Layers
} from 'lucide-react';

export default function OracleIntelligence() {
  const [objects, setObjects] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [impactResults, setImpactResults] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({ type: '', msg: '' });
  const [activeTab, setActiveTab] = useState('schema'); // 'schema' | 'er' | 'impact'
  const [isUploading, setIsUploading] = useState(false);
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
      const objData = await api.get('/oracle/objects');
      const depData = await api.get('/oracle/dependencies');
      setObjects(objData);
      setDependencies(depData);
    } catch (err) {
      console.error("Failed to load Oracle metadata", err);
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
      fetchSchemaData();
    } catch (err) {
      setUploadStatus({ 
        type: 'error', 
        msg: err.response?.data?.detail || "Failed to process Oracle DDL file." 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerImpactAnalysis = async (obj) => {
    setSelectedObject(obj);
    try {
      const results = await api.get(`/oracle/impact-analysis?object_id=${obj.id}`);
      setImpactResults(results);
      setActiveTab('impact');
    } catch (err) {
      console.error("Impact analysis failed", err);
    }
  };

  const renderErDiagram = () => {
    if (!window.mermaid || !mermaidRef.current) return;
    
    // Generate Mermaid DDL dynamically
    const tables = objects.filter(o => o.object_type === 'TABLE');
    if (tables.length === 0) {
      mermaidRef.current.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No schemas parsed yet. Upload an Oracle DDL file to generate diagram.</div>`;
      return;
    }

    let graphDefinition = 'erDiagram\n';
    
    // Define tables
    tables.forEach(t => {
      // Basic ER representation
      graphDefinition += `    ${t.object_name} {\n        varchar object_type\n    }\n`;
    });

    // Define relations (Foreign Keys)
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
    <div className="workspace-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database size={32} style={{ color: 'var(--color-primary)' }} />
            <span>Oracle Database Intelligence</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Extract constraints, view structures, and triggers. Compute down-stream application impacts of column updates.
          </p>
        </div>
        
        {/* Upload Button */}
        <div>
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
            style={{ gap: '8px' }}
          >
            <Upload size={16} />
            <span>{isUploading ? 'Parsing Schema...' : 'Upload Oracle DDL'}</span>
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

      {/* Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '24px' }}>
        <button 
          onClick={() => setActiveTab('schema')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'schema' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'schema' ? '2px solid var(--color-primary)' : 'none',
            padding: '12px 4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '15px'
          }}
        >
          Schema catalog ({objects.length})
        </button>
        <button 
          onClick={() => setActiveTab('er')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'er' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'er' ? '2px solid var(--color-primary)' : 'none',
            padding: '12px 4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '15px'
          }}
        >
          ER Relationship Diagram
        </button>
        <button 
          onClick={() => setActiveTab('impact')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'impact' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'impact' ? '2px solid var(--color-primary)' : 'none',
            padding: '12px 4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '15px'
          }}
        >
          Downstream Impact analysis {selectedObject && `(${selectedObject.object_name})`}
        </button>
      </div>

      {/* Workspace Body */}
      <div className="card" style={{ padding: '24px' }}>
        {activeTab === 'schema' && (
          <div>
            {objects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Layers size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <h3>No parsed schemas discovered</h3>
                <p>Upload a DDL file containing CREATE statements to start modeling your DB.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                      <th style={{ padding: '12px 8px' }}>Object Name</th>
                      <th style={{ padding: '12px 8px' }}>Type</th>
                      <th style={{ padding: '12px 8px' }}>Owner</th>
                      <th style={{ padding: '12px 8px' }}>Dependencies</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {objects.map(obj => {
                      const depsCount = dependencies.filter(d => d.source_object_id === obj.id).length;
                      return (
                        <tr key={obj.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 500, color: 'var(--text-main)' }}>{obj.object_name}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                              fontWeight: 500
                            }}>
                              {obj.object_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{obj.owner}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{depsCount} references</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <button 
                              onClick={() => triggerImpactAnalysis(obj)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 12px', fontSize: '12px', gap: '4px' }}
                            >
                              <Play size={12} />
                              <span>Trace Impact</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'er' && (
          <div>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Visual Entity Relationship Modeler</h3>
            <div 
              ref={mermaidRef} 
              className="mermaid" 
              style={{ 
                background: '#040711', 
                padding: '32px', 
                borderRadius: '8px', 
                minHeight: '300px',
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
          <div>
            {!selectedObject ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <h3>No trace object selected</h3>
                <p>Select a table or view in the Schema catalog and click "Trace Impact" to map dependencies.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', p: '12px', borderRadius: '8px', display: 'flex', padding: '12px' }}>
                    <Database size={24} style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tracing Source</span>
                    <h3 style={{ color: 'var(--text-main)' }}>{selectedObject.object_name} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-muted)' }}>({selectedObject.object_type})</span></h3>
                  </div>
                </div>

                <h4 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Downstream Affected Objects ({impactResults.length})</h4>
                {impactResults.length === 0 ? (
                  <div style={{ padding: '24px', background: 'rgba(34, 197, 94, 0.05)', color: 'var(--status-completed)', border: '1px dashed rgba(34, 197, 94, 0.2)', borderRadius: '8px', fontSize: '14px' }}>
                    No cascading impact found. Modifying this table will not break any downstream views, procedures, or triggers.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {impactResults.map((item, idx) => (
                      <div key={item.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '14px 16px', 
                        background: '#0d1321', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '12px', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: 'var(--status-failed)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            {item.depth}
                          </span>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '15px' }}>{item.object_name}</span>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Type: {item.object_type} | Cause: {item.dep_type}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-failed)', fontSize: '13px' }}>
                          <AlertTriangle size={14} />
                          <span>Broken reference risk</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
