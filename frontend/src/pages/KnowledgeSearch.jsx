import React, { useState } from 'react';
import { api } from '../services/api';
import ChatWindow from '../components/ChatWindow';
import { Search, Compass, BookOpen, AlertCircle } from 'lucide-react';

export default function KnowledgeSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError('');
    try {
      const data = await api.hybridSearch(searchQuery);
      setSearchResults(data.results);
    } catch (err) {
      setError(err.message || 'Search execution failed.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ height: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Knowledge Search Explorer</h1>
        <p style={{ color: 'var(--text-muted)' }}>Perform hybrid semantic searches across indexed files and converse with the RAG assistant.</p>
      </div>

      <div className="search-layout">
        {/* Left Panel: Hybrid Search Engine */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="panel-title">
            <Compass size={22} style={{ color: 'var(--color-secondary)' }} />
            <h2 style={{ fontSize: '18px' }}>Hybrid Search Engine</h2>
          </div>

          <form onSubmit={handleSearchSubmit} className="search-box">
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

          {error && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--status-failed)', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="search-results-list">
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dark)' }}>
                <BookOpen size={48} style={{ opacity: 0.15, margin: '0 auto 16px auto' }} />
                <p>Submit a keyword or semantic phrase query above to locate document context chunks.</p>
              </div>
            ) : (
              searchResults.map((result, idx) => (
                <div key={idx} className="card result-item" style={{ padding: '16px', marginBottom: '12px' }}>
                  <div className="result-header">
                    <span className="result-filename">{result.filename}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
                      Score: {result.score.toFixed(4)}
                    </span>
                  </div>
                  <p className="result-content">{result.chunk_content}</p>
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
    </div>
  );
}
