import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Terminal, 
  Play, 
  Copy, 
  Check, 
  Code, 
  ShieldCheck, 
  ShieldAlert, 
  Database, 
  History, 
  Loader2, 
  Sparkles, 
  FileText,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Wand2,
  Cpu
} from 'lucide-react';

export default function SqlWriter() {
  const [prompt, setPrompt] = useState('Write an Oracle SQL query to retrieve account ledger transactions grouped by user role and date.');
  const [dialect, setDialect] = useState('ORACLE');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  
  const [schemaTree, setSchemaTree] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [activeTab, setActiveTab] = useState('schema'); // 'schema' or 'history'
  
  const [searchSchema, setSearchSchema] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedTables, setExpandedTables] = useState({});
  const [error, setError] = useState('');
  const [explanation, setExplanation] = useState('');

  // Load Schema Tree and History on mount
  useEffect(() => {
    loadSchemaTree();
    loadHistory();
  }, []);

  const loadSchemaTree = async () => {
    try {
      const data = await api.get('/sql/schema');
      setSchemaTree(data.tables || []);
    } catch (err) {
      console.error('Failed to load database schema tree:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.get('/sql/history');
      setHistoryList(data || []);
    } catch (err) {
      console.error('Failed to load SQL generation history:', err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please provide a natural language description for the query.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setExplanation('');

    try {
      const res = await api.post('/sql/generate', {
        prompt: prompt,
        dialect: dialect
      });

      setGeneratedResult(res);
      setExplanation(res.explanation || '');
      loadHistory(); // refresh history
    } catch (err) {
      console.error(err);
      setError(err.message || 'SQL generation failed. Please check LLM server.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormat = async () => {
    if (!generatedResult?.generated_sql) return;
    setIsFormatting(true);
    try {
      const res = await api.post('/sql/format', {
        sql: generatedResult.generated_sql,
        dialect: dialect
      });
      setGeneratedResult(prev => ({ ...prev, generated_sql: res.formatted_sql }));
    } catch (err) {
      console.error('Format failed:', err);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleExplain = async () => {
    if (!generatedResult?.generated_sql) return;
    setIsExplaining(true);
    try {
      const res = await api.post('/sql/explain', {
        sql: generatedResult.generated_sql,
        dialect: dialect
      });
      setExplanation(res.explanation);
    } catch (err) {
      console.error('Explain failed:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult?.generated_sql) return;
    navigator.clipboard.writeText(generatedResult.generated_sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTableExpand = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const insertTableToPrompt = (tableName) => {
    setPrompt(prev => prev ? `${prev} from table ${tableName}` : `SELECT data from ${tableName}`);
  };

  const loadHistoryItem = (item) => {
    setPrompt(item.prompt);
    setDialect(item.dialect);
    setGeneratedResult(item);
    setExplanation(item.explanation || '');
  };

  const filteredTables = schemaTree.filter(t => 
    t.table_name.toLowerCase().includes(searchSchema.toLowerCase()) ||
    t.columns.some(c => c.column_name.toLowerCase().includes(searchSchema.toLowerCase()))
  );

  return (
    <div>
      {/* Title Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Terminal size={32} style={{ color: 'var(--color-primary)' }} />
          <span>AI-Powered SQL Writer</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Draft, validate, and analyze schema-aware Oracle PL/SQL and PostgreSQL queries with automated read-only safety guardrails.
        </p>
      </div>

      {/* Main Grid: Left Panel (Schema Explorer & History), Right Panel (SQL Studio Editor & Outputs) */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Tabs for Schema Explorer & Query History */}
        <div className="card" style={{ padding: '20px', minHeight: '620px', display: 'flex', flexDirection: 'column' }}>
          {/* Tab buttons */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('schema')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: activeTab === 'schema' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'schema' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'schema' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <Database size={15} style={{ color: 'var(--color-primary)' }} />
              <span>Schema ({schemaTree.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: activeTab === 'history' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'history' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <History size={15} style={{ color: 'var(--color-secondary)' }} />
              <span>History ({historyList.length})</span>
            </button>
          </div>

          {/* TAB 1: SCHEMA EXPLORER TREE */}
          {activeTab === 'schema' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  value={searchSchema}
                  onChange={(e) => setSearchSchema(e.target.value)}
                  placeholder="Filter tables or columns..."
                  className="form-input"
                  style={{ paddingLeft: '30px', fontSize: '12px' }}
                />
              </div>

              <div style={{ flex: 1, maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTables.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '30px' }}>
                    No database schema objects found.
                  </p>
                ) : (
                  filteredTables.map((table) => {
                    const isExpanded = expandedTables[table.table_name];
                    return (
                      <div 
                        key={table.table_name} 
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}
                      >
                        <div 
                          onClick={() => toggleTableExpand(table.table_name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(99, 102, 241, 0.08)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <Database size={13} style={{ color: 'var(--color-primary)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {table.table_name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); insertTableToPrompt(table.table_name); }}
                            title="Add table name to prompt"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-secondary)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            + Use
                          </button>
                        </div>

                        {/* Collapsible Columns */}
                        {isExpanded && (
                          <div style={{ padding: '6px 12px 10px 24px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                            {table.columns.map((col, cIdx) => (
                              <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0', color: 'var(--text-muted)' }}>
                                <span>• {col.column_name}</span>
                                <span style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: '10px' }}>{col.data_type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: QUERY HISTORY */}
          {activeTab === 'history' && (
            <div style={{ flex: 1, maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historyList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '30px' }}>
                  No generated SQL history recorded yet.
                </p>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      background: generatedResult?.id === item.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.03)',
                      border: generatedResult?.id === item.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(99, 102, 241, 0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                        {item.dialect}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dark)' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.prompt}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI SQL Studio Editor & Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Natural Language Prompt & Dialect Form */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Natural Language Query Specification</span>
              </h3>

              {/* Dialect Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Target Dialect:</span>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setDialect('ORACLE')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: dialect === 'ORACLE' ? 'var(--color-primary)' : 'transparent',
                      color: dialect === 'ORACLE' ? '#fff' : 'var(--text-muted)'
                    }}
                  >
                    Oracle SQL
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialect('POSTGRESQL')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: dialect === 'POSTGRESQL' ? 'var(--color-secondary)' : 'transparent',
                      color: dialect === 'POSTGRESQL' ? '#fff' : 'var(--text-muted)'
                    }}
                  >
                    PostgreSQL
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your query requirement in plain English (e.g., Get top 10 users with active balance...)..."
                className="form-input"
                style={{ minHeight: '80px', fontSize: '13px', lineHeight: '1.5', padding: '12px' }}
              />
            </div>

            {error && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--status-failed)', 
                padding: '12px', 
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '13px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="btn btn-primary btn-full"
              style={{ gap: '8px', padding: '10px' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Synthesizing Schema-Aware {dialect} SQL...</span>
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  <span>Generate AI SQL Query</span>
                </>
              )}
            </button>
          </div>

          {/* Generated SQL Code Editor Viewport */}
          {generatedResult && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Header Action Bar & Safety Guardrail Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Code size={18} style={{ color: 'var(--color-secondary)' }} />
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>Generated {generatedResult.dialect} Query</span>
                  
                  {/* Safety Guardrail Status */}
                  {generatedResult.is_safe ? (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      borderRadius: '12px', 
                      background: 'rgba(16, 185, 129, 0.15)', 
                      color: 'var(--status-completed)',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <ShieldCheck size={13} />
                      <span>Read-Only Verified</span>
                    </span>
                  ) : (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      borderRadius: '12px', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      color: 'var(--status-failed)',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      <ShieldAlert size={13} />
                      <span>Safety Guardrail Warning</span>
                    </span>
                  )}
                </div>

                {/* Toolbar Buttons: Format, Explain, Copy */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleFormat}
                    disabled={isFormatting}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                  >
                    {isFormatting ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                    <span>Format</span>
                  </button>

                  <button
                    onClick={handleExplain}
                    disabled={isExplaining}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                  >
                    {isExplaining ? <Loader2 size={13} className="animate-spin" /> : <Cpu size={13} />}
                    <span>Explain Plan</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                  </button>
                </div>
              </div>

              {/* Safety Warning Banner if non-select operations detected */}
              {generatedResult.safety_warning && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  padding: '10px 14px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  color: 'var(--status-failed)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ShieldAlert size={16} />
                  <span>{generatedResult.safety_warning}</span>
                </div>
              )}

              {/* Styled Monospaced Code Viewport */}
              <div 
                style={{ 
                  background: '#0d1117', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '16px 20px', 
                  fontFamily: 'monospace', 
                  fontSize: '13px', 
                  color: '#f1f5f9', 
                  lineHeight: '1.6', 
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
                }}
              >
                {generatedResult.generated_sql}
              </div>

              {/* Technical Explanation Card */}
              {explanation && (
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.06)', 
                  border: '1px solid rgba(99, 102, 241, 0.15)', 
                  borderRadius: '8px', 
                  padding: '14px 18px' 
                }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', tracking: '0.05em', color: 'var(--color-primary)', fontWeight: 700 }}>
                    Execution Plan & Logic Breakdown
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: '6px 0 0 0', lineHeight: '1.6' }}>
                    {explanation}
                  </p>
                </div>
              )}

            </div>
          )}

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
