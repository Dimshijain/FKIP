import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { 
  FileText, 
  Cpu, 
  Loader2, 
  Trash2, 
  Download, 
  ChevronRight, 
  BookOpen,
  ArrowLeft,
  Check
} from 'lucide-react';

export default function DocGenerator() {
  const [docList, setDocList] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocContent, setSelectedDocContent] = useState(null);
  const [docType, setDocType] = useState('BRD'); // 'BRD', 'SRS', 'TECH_DESIGN', 'API_DOCS', 'RELEASE_NOTES', 'USER_MANUAL'
  const [docTitle, setDocTitle] = useState('Project BRD Spec');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userRole = getUserRole() || 'CONSUMER';

  const loadDocList = async () => {
    try {
      setIsLoadingList(true);
      const data = await api.get('/docs');
      setDocList(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch generated specs registry.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadDocList();
  }, []);

  const handleGenerate = async () => {
    if (!docTitle.trim()) {
      setError('Please provide a document title.');
      return;
    }

    if (userRole === 'CONSUMER') {
      setError('Viewer accounts cannot trigger AI doc generation.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/docs/generate', { doc_type: docType, title: docTitle });
      setDocList([res, ...docList]);
      setSuccess(`Successfully drafted ${docType} "${docTitle}" using Ollama.`);
      setSelectedDocId(res.id);
      setSelectedDocContent(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Auto-draft generation failed. Please verify LLM server.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectDoc = async (id) => {
    setSelectedDocId(id);
    setIsLoadingDetail(true);
    setError('');
    
    try {
      const data = await api.get(`/docs/${id}`);
      setSelectedDocContent(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load document content.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDeleteDoc = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/docs/${id}`);
      const updated = docList.filter(d => d.id !== id);
      setDocList(updated);
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setSelectedDocContent(null);
      }
      setSuccess('Document purged from database.');
    } catch (err) {
      console.error(err);
      setError('Failed to delete document.');
    }
  };

  const handleDownload = (doc) => {
    const element = document.createElement("a");
    const file = new Blob([doc.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${doc.title.replace(/\s+/g, '_').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>AI Documentation Generator</h1>
        <p style={{ color: 'var(--text-muted)' }}>Generate context-aware software specifications, business requirements, and manuals drafted using local LLM algorithms.</p>
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
          <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 2s linear infinite', marginRight: '6px' }} />
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
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid: Left Column (Template forms and spec list), Right Column (Markdown Viewer) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '32px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Document Generation form */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Draft New Specification</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Template Type</label>
              <select 
                value={docType} 
                onChange={(e) => {
                  setDocType(e.target.value);
                  const names = {
                    'BRD': 'Project BRD Spec',
                    'SRS': 'System SRS Spec',
                    'TECH_DESIGN': 'Technical Design Blueprint',
                    'API_DOCS': 'API Integration Reference',
                    'RELEASE_NOTES': 'Release Notes Summary',
                    'USER_MANUAL': 'End-User System Manual'
                  };
                  setDocTitle(names[e.target.value] || 'Spec draft');
                }}
                className="form-select"
              >
                <option value="BRD">Business Requirement Document (BRD)</option>
                <option value="SRS">Software Requirement Specification (SRS)</option>
                <option value="TECH_DESIGN">Technical Design Document</option>
                <option value="API_DOCS">API Documentation</option>
                <option value="RELEASE_NOTES">Release Notes</option>
                <option value="USER_MANUAL">User Manual</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Document Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Title name..."
              />
            </div>

            {userRole === 'CONSUMER' ? (
              <p style={{ color: 'var(--status-failed)', fontSize: '12px' }}>Viewer roles cannot generate documents.</p>
            ) : (
              <button 
                onClick={handleGenerate}
                className="btn btn-primary btn-full"
                disabled={isGenerating}
                style={{ gap: '8px' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Ollama is drafting (approx 15s)...</span>
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    <span>Generate AI Document</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Generated Documents History registry */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--color-secondary)' }} />
              <span>Specs Archive</span>
            </h3>

            {isLoadingList ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading registry...</p>
            ) : docList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No documents generated yet. Use form above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {docList.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: selectedDocId === doc.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      border: selectedDocId === doc.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    className="spec-item"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '170px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.title}>
                        {doc.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {doc.doc_type.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <button 
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.target.style.color = 'var(--status-failed)'}
                      onMouseLeave={(e) => e.target.style.color = 'var(--text-dark)'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Markdown Viewer */}
        <div className="card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          {!selectedDocId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', padding: '100px 0' }}>
              <FileText size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <p>Select a specification file from the specs archive to preview contents.</p>
            </div>
          ) : isLoadingDetail ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
            </div>
          ) : selectedDocContent ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Document Header actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{selectedDocContent.title}</h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Type: {selectedDocContent.doc_type.toUpperCase()} • Author: {selectedDocContent.author || 'system'}
                  </span>
                </div>
                <button 
                  onClick={() => handleDownload(selectedDocContent)} 
                  className="btn btn-secondary" 
                  style={{ gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                >
                  <Download size={14} />
                  <span>Download .md</span>
                </button>
              </div>

              {/* Styled markdown output viewport */}
              <div style={{ 
                flex: 1, 
                maxHeight: '600px', 
                overflowY: 'auto', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '24px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#f1f5f9',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedDocContent.content}
              </div>
            </div>
          ) : null}
        </div>

      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
