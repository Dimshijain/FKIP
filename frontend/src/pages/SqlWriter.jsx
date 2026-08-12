import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard, SkeletonList } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
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
  Cpu,
  Download
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
  const [activeTab, setActiveTab] = useState('schema');
  
  const [searchSchema, setSearchSchema] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedTables, setExpandedTables] = useState({});
  const [error, setError] = useState('');
  const [explanation, setExplanation] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadInitialSqlData();
  }, []);

  const loadInitialSqlData = async () => {
    try {
      const [schemaData, historyData] = await Promise.all([
        api.get('/sql/schema'),
        api.get('/sql/history')
      ]);
      setSchemaTree(schemaData.tables || []);
      setHistoryList(historyData || []);
    } catch (err) {
      console.error('Failed to load SQL metadata / history:', err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.warning('Please enter a natural language prompt.');
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
      toast.success(`Generated ${dialect} SQL query successfully.`);
      loadHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'SQL generation failed.');
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
      toast.success('SQL query formatted cleanly.');
    } catch (err) {
      toast.error('Format execution failed.');
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
      toast.info('Execution plan & logic breakdown updated.');
    } catch (err) {
      toast.error('Explain plan failed.');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult?.generated_sql) return;
    navigator.clipboard.writeText(generatedResult.generated_sql);
    setCopied(true);
    toast.success('SQL query copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    if (!generatedResult?.generated_sql) return;
    const element = document.createElement('a');
    const file = new Blob([generatedResult.generated_sql], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `fkip_query_${dialect.toLowerCase()}_${Date.now()}.sql`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.info('SQL file downloaded.');
  };

  const loadHistory = async () => {
    try {
      const historyData = await api.get('/sql/history');
      setHistoryList(historyData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTableExpand = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const insertTableToPrompt = (tableName) => {
    setPrompt(prev => `${prev} [Table: ${tableName}]`);
    toast.info(`Appended ${tableName} to query prompt.`);
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
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <Terminal size={28} className="page-title-icon" />
              <span>AI-Powered SQL Writer</span>
            </h1>
            <span className="badge badge-primary">Schema-Aware</span>
          </div>
          <p className="page-subtitle">
            Draft, validate, and analyze schema-aware Oracle PL/SQL and PostgreSQL queries with automated read-only safety guardrails.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Panel (Schema Explorer & History), Right Panel (SQL Studio Editor & Outputs) */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Tabs for Schema Explorer & Query History */}
        <div className="card" style={{ padding: 'var(--space-5)', minHeight: '620px', display: 'flex', flexDirection: 'column' }}>
          {/* Tab buttons */}
          <div className="tab-nav" style={{ marginBottom: 'var(--space-4)' }}>
            <button
              onClick={() => setActiveTab('schema')}
              className={`tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Database size={15} />
              <span>Schema ({schemaTree.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <History size={15} />
              <span>History ({historyList.length})</span>
            </button>
          </div>

          {/* TAB 1: SCHEMA EXPLORER TREE */}
          {activeTab === 'schema' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="search-input-group" style={{ marginBottom: 'var(--space-4)' }}>
                <Search size={14} className="search-input-icon" />
                <input 
                  type="text" 
                  value={searchSchema}
                  onChange={(e) => setSearchSchema(e.target.value)}
                  placeholder="Filter tables or columns..."
                  className="form-input"
                  style={{ height: '36px', fontSize: '12px' }}
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
                        className="card-subtle"
                        style={{ padding: '0', overflow: 'hidden' }}
                      >
                        <div 
                          onClick={() => toggleTableExpand(table.table_name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            background: isExpanded ? 'var(--color-primary-subtle)' : 'transparent'
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
                            className="btn-sm btn-secondary"
                            style={{ height: '24px', padding: '0 6px', fontSize: '10px' }}
                          >
                            + Use
                          </button>
                        </div>

                        {/* Collapsible Columns */}
                        {isExpanded && (
                          <div style={{ padding: '6px 12px 10px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                            {table.columns.map((col, cIdx) => (
                              <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0', color: 'var(--text-muted)' }}>
                                <span>• {col.column_name}</span>
                                <span style={{ color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{col.data_type}</span>
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
                    className="card-subtle"
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderLeft: generatedResult?.id === item.id ? '3px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: generatedResult?.id === item.id ? 'var(--color-primary-subtle)' : 'var(--card-subtle-bg)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 6px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Natural Language Prompt & Dialect Form */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="section-title">
                <Sparkles size={18} className="section-title-icon" />
                <span>Natural Language Query Specification</span>
              </h3>

              {/* Dialect Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Target Dialect:</span>
                <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setDialect('ORACLE')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-xs)',
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
                      borderRadius: 'var(--radius-xs)',
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

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your query requirement in plain English (e.g., Get top 10 users with active balance...)..."
                className="form-textarea"
                style={{ minHeight: '80px', fontSize: '13px', lineHeight: '1.5' }}
              />
            </div>

            {error && (
              <div className="alert-banner alert-banner-error">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="btn btn-primary"
              style={{ width: '100%', gap: '8px' }}
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
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              {/* Header Action Bar & Safety Guardrail Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Code size={18} style={{ color: 'var(--color-secondary)' }} />
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>Generated {generatedResult.dialect} Query</span>
                  
                  {/* Safety Guardrail Status */}
                  {generatedResult.is_safe ? (
                    <span className="badge badge-success">
                      <ShieldCheck size={13} />
                      <span>Read-Only Verified</span>
                    </span>
                  ) : (
                    <span className="badge badge-danger">
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
                    className="btn btn-secondary btn-sm"
                  >
                    {isFormatting ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                    <span>Format</span>
                  </button>

                  <button
                    onClick={handleExplain}
                    disabled={isExplaining}
                    className="btn btn-secondary btn-sm"
                  >
                    {isExplaining ? <Loader2 size={13} className="animate-spin" /> : <Cpu size={13} />}
                    <span>Explain Plan</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="btn btn-primary btn-sm"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                  </button>

                  <button
                    onClick={handleDownloadSql}
                    className="btn btn-secondary btn-sm"
                    title="Download .sql Script"
                  >
                    <Download size={13} />
                    <span>Download .sql</span>
                  </button>
                </div>
              </div>

              {/* Safety Warning Banner if non-select operations detected */}
              {generatedResult.safety_warning && (
                <div className="alert-banner alert-banner-warning">
                  <ShieldAlert size={16} />
                  <span>{generatedResult.safety_warning}</span>
                </div>
              )}

              {/* Styled Monospaced Code Viewport */}
              <div 
                style={{ 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px 20px', 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '13px', 
                  color: 'var(--text-main)', 
                  lineHeight: '1.6', 
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)'
                }}
              >
                {generatedResult.generated_sql}
              </div>

              {/* Technical Explanation Card */}
              {explanation && (
                <div className="card-subtle" style={{ padding: '14px 18px', borderLeft: '3px solid var(--color-primary)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700 }}>
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
    </div>
  );
}
