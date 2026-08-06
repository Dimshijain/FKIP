import React, { useState } from 'react';
import { api } from '../services/api';
import ChatWindow from '../components/ChatWindow';
import { useToast } from '../components/ToastContext';
import { SkeletonCard } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { Search, Compass, BookOpen, AlertCircle, Filter, FileText, Copy, ExternalLink, X, Check } from 'lucide-react';

export default function KnowledgeSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [minScore, setMinScore] = useState(0.10);
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [activeModalChunk, setActiveModalChunk] = useState(null);
  const [copiedChunkId, setCopiedChunkId] = useState(null);
  const toast = useToast();

  const tags = [
    { id: 'ALL', name: 'All Documents' },
    { id: 'SPEC', name: 'System Architecture' },
    { id: 'LEDGER', name: 'Core Ledger' },
    { id: 'PAYMENT', name: 'ISO20022 Payments' }
  ];

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const data = await api.hybridSearch(searchQuery, 6, minScore);
      setSearchResults(data.results || []);
      toast.info(`Retrieved ${data.results?.length || 0} matching document chunks.`);
    } catch (err) {
      toast.error(err.message || 'Search execution failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyChunk = (idx, text) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(idx);
    toast.success('Chunk snippet copied to clipboard.');
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const filteredResults = searchResults.filter(r => {
    if (selectedTag === 'ALL') return true;
    return r.filename.toUpperCase().includes(selectedTag);
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Knowledge Search Explorer</h1>
          <span className="badge badge-secondary">Hybrid Vector RAG</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>Perform hybrid semantic search across indexed architecture specifications and converse with the RAG assistant.</p>
      </div>

      <div className="search-layout" style={{ flex: 1, minHeight: 0 }}>
        {/* Left Panel: Hybrid Search Engine */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: '20px' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={20} style={{ color: 'var(--color-secondary)' }} />
              <h2 style={{ fontSize: '18px' }}>Hybrid Search Engine</h2>
            </div>
            <span className="badge badge-primary">{filteredResults.length} Chunks</span>
          </div>

          <form onSubmit={handleSearchSubmit} className="search-box" style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search database design schemas, release notes, workflow steps..."
              className="form-input"
            />
            <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSearching}>
              <Search size={16} />
              <span>{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </form>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {tags.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTag(t.id)}
                  className={`badge ${selectedTag === t.id ? 'badge-primary' : 'badge-secondary'}`}
                  style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Min Score:</span>
              <select 
                value={minScore} 
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="pagination-select"
                style={{ fontSize: '12px' }}
              >
                <option value={0.05}>0.05 (Broad)</option>
                <option value={0.10}>0.10 (Standard)</option>
                <option value={0.30}>0.30 (Strict)</option>
                <option value={0.50}>0.50 (Exact)</option>
              </select>
            </div>
          </div>

          {/* Search Results */}
          <div className="search-results-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {isSearching ? (
              <SkeletonCard count={3} />
            ) : filteredResults.length === 0 ? (
              <EmptyState 
                icon={BookOpen} 
                title="No Matching Document Chunks" 
                description="Submit a keyword query above to query indexed architecture specifications." 
              />
            ) : (
              filteredResults.map((result, idx) => (
                <div key={idx} className="card result-item" style={{ padding: '16px', marginBottom: '12px', borderLeft: '4px solid var(--color-secondary)' }}>
                  <div className="result-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} style={{ color: 'var(--color-secondary)' }} />
                      <span className="result-filename" style={{ fontSize: '14px', fontWeight: 600 }}>{result.filename}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-success">
                        {(result.score * 100).toFixed(0)}% Confidence
                      </span>
                      <button 
                        onClick={() => handleCopyChunk(idx, result.chunk_content)}
                        className="pagination-btn"
                        style={{ width: '28px', height: '28px' }}
                        title="Copy Snippet"
                      >
                        {copiedChunkId === idx ? <Check size={14} style={{ color: 'var(--status-completed)' }} /> : <Copy size={14} />}
                      </button>
                      <button 
                        onClick={() => setActiveModalChunk(result)}
                        className="pagination-btn"
                        style={{ width: '28px', height: '28px' }}
                        title="Inspect Full Chunk"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="result-content" style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                    {result.chunk_content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: RAG Chat Assistant */}
        <div style={{ height: '100%' }}>
          <ChatWindow />
        </div>
      </div>

      {/* Inspect Chunk Modal Drawer */}
      {activeModalChunk && (
        <div className="modal-overlay" onClick={() => setActiveModalChunk(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: 'var(--color-secondary)' }} />
                <h3 style={{ fontSize: '18px' }}>{activeModalChunk.filename}</h3>
              </div>
              <button onClick={() => setActiveModalChunk(null)} className="toast-close">
                <X size={18} />
              </button>
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="badge badge-success">Score: {activeModalChunk.score.toFixed(4)}</span>
              <span className="badge badge-primary">Chunk ID: {activeModalChunk.chunk_id}</span>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto' }}>
              {activeModalChunk.chunk_content}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModalChunk(null)} className="btn btn-secondary">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
