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
  Download,
  Table as TableIcon,
  Clock,
  FileCheck,
  FilePlus,
  Edit3,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SqlWriter() {
  const [prompt, setPrompt] = useState('Write an Oracle SQL query to retrieve account ledger transactions grouped by user role and date.');
  const [dialect, setDialect] = useState('ORACLE');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  
  // Execution State
  const [queryResult, setQueryResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execError, setExecError] = useState(null);

  // Documentation Workflow State
  const [showDocModal, setShowDocModal] = useState(false);
  const [docMode, setDocMode] = useState('create'); // 'create' or 'update'
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('TECH_DESIGN');
  const [docContent, setDocContent] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  
  // Update Document State
  const [existingDocs, setExistingDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [appendSectionPreview, setAppendSectionPreview] = useState('');
  const [isUpdatingDoc, setIsUpdatingDoc] = useState(false);
  
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
    setQueryResult(null);
    setExecError(null);

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

  const handleRunQuery = async () => {
    if (!generatedResult?.generated_sql) {
      toast.warning('Please generate a SQL query first.');
      return;
    }
    if (!generatedResult.is_safe) {
      toast.error(generatedResult.safety_warning || 'Execution blocked: SQL statement contains non-read-only operations.');
      return;
    }

    setIsExecuting(true);
    setExecError(null);
    setQueryResult(null);

    try {
      const res = await api.post('/sql/execute', {
        sql: generatedResult.generated_sql,
        dialect: dialect,
        prompt: prompt,
        history_id: generatedResult.id
      });

      if (res.success) {
        setQueryResult(res);
        toast.success(`Query executed successfully! (${res.row_count} rows in ${res.execution_time_ms}ms)`);
        loadHistory();
      } else {
        setExecError(res.error || 'Query execution failed.');
        toast.error(res.error || 'Query execution failed.');
      }
    } catch (err) {
      console.error('Execution error:', err);
      const msg = err.message || 'Server error executing query.';
      setExecError(msg);
      toast.error(msg);
    } finally {
      setIsExecuting(false);
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

  const handleExportCsv = () => {
    if (!queryResult?.rows || queryResult.rows.length === 0) {
      toast.warning('No query result rows to export.');
      return;
    }
    const cols = queryResult.columns;
    const csvLines = [cols.join(',')];
    for (const row of queryResult.rows) {
      const line = cols.map(c => {
        const val = row[c] ?? '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',');
      csvLines.push(line);
    }
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fkip_query_results_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info('Results CSV downloaded.');
  };

  const handleOpenDocModal = async () => {
    if (!generatedResult?.generated_sql) return;
    setShowDocModal(true);
    setDocMode('create');
    setIsGeneratingDoc(true);
    
    // Pre-load existing documents list
    try {
      const docs = await api.get('/docs');
      setExistingDocs(docs || []);
      if (docs && docs.length > 0) {
        setSelectedDocId(docs[0].id);
        setSelectedDoc(docs[0]);
      }
    } catch (err) {
      console.error('Failed to load existing documents', err);
    }

    // Generate structured documentation preview
    try {
      const docRes = await api.post('/sql/generate-docs', {
        sql: generatedResult.generated_sql,
        dialect: dialect,
        prompt: prompt,
        explanation: explanation,
        columns: queryResult?.columns || [],
        row_count: queryResult?.row_count || 0,
        execution_time_ms: queryResult?.execution_time_ms || 0.0,
        doc_type: 'TECH_DESIGN',
        sample_rows: queryResult?.rows || []
      });

      setDocTitle(docRes.title || `Technical Specification: ${prompt.slice(0, 45)}`);
      setDocContent(docRes.content || '');
      setAppendSectionPreview(`\n\n## SQL Telemetry Specification (${dialect})\n\n**Natural Language Prompt:** ${prompt}\n\n\`\`\`sql\n${generatedResult.generated_sql}\n\`\`\`\n\n- **Execution Status:** SUCCESS\n- **Rows Returned:** ${queryResult?.row_count || 0}\n- **Execution Latency:** ${queryResult?.execution_time_ms || 0} ms\n- **Timestamp:** ${new Date().toUTCString()}\n`);
    } catch (err) {
      console.error('Doc gen error:', err);
      toast.error('Failed to generate automated documentation preview.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleSaveNewDoc = async () => {
    if (!docTitle.trim() || !docContent.trim()) {
      toast.warning('Please provide a document title and content.');
      return;
    }
    setIsSavingDoc(true);
    try {
      const newDoc = await api.post('/docs/custom', {
        title: docTitle,
        doc_type: docType,
        content: docContent
      });
      toast.success(`Document "${newDoc.title}" saved to Knowledge Base!`);
      setShowDocModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save document.');
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleUpdateExistingDoc = async () => {
    if (!selectedDocId) {
      toast.warning('Please select an existing target document.');
      return;
    }
    setIsUpdatingDoc(true);
    try {
      const updated = await api.put(`/docs/${selectedDocId}`, {
        append_content: appendSectionPreview
      });
      toast.success(`Successfully updated "${updated.title}" with new SQL telemetry section!`);
      setShowDocModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update document.');
    } finally {
      setIsUpdatingDoc(false);
    }
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
    setQueryResult(null);
    setExecError(null);
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
            Draft, validate, execute, and document schema-aware Oracle PL/SQL and PostgreSQL queries with automated read-only safety guardrails.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Panel (Schema Explorer & History), Right Panel (SQL Studio Editor & Outputs) */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Tabs for Schema Explorer & Query History */}
        <div className="card" style={{ padding: 'var(--space-5)', minHeight: '680px', display: 'flex', flexDirection: 'column' }}>
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

              <div style={{ flex: 1, maxHeight: '540px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div style={{ flex: 1, maxHeight: '560px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 5px' }}>
                          {item.dialect}
                        </span>
                        {item.execution_status === 'SUCCESS' && (
                          <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 4px' }}>
                            <CheckCircle2 size={10} /> Executed
                          </span>
                        )}
                        {item.execution_status === 'BLOCKED' && (
                          <span className="badge badge-danger" style={{ fontSize: '9px', padding: '1px 4px' }}>
                            Blocked
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: '0 0 4px 0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.prompt}
                    </p>

                    {item.row_count !== null && item.row_count !== undefined && (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>• {item.row_count} rows</span>
                        {item.execution_time_ms && <span>• {item.execution_time_ms}ms</span>}
                      </div>
                    )}
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
              <div className="alert-banner alert-banner-error" style={{ marginBottom: 'var(--space-4)' }}>
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

                {/* Toolbar Buttons: Run Query, Format, Explain, Copy, Download */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  
                  {/* RUN QUERY BUTTON (User Controlled) */}
                  <button
                    onClick={handleRunQuery}
                    disabled={isExecuting || !generatedResult.is_safe}
                    className="btn btn-primary btn-sm"
                    style={{ 
                      background: generatedResult.is_safe ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--bg-input)',
                      borderColor: generatedResult.is_safe ? '#10b981' : 'var(--border-color)',
                      color: '#fff',
                      boxShadow: generatedResult.is_safe ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                      fontWeight: 700
                    }}
                    title={generatedResult.is_safe ? "Execute safe read-only SQL query against database" : "Execution blocked by safety guardrail"}
                  >
                    {isExecuting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} style={{ fill: 'currentColor' }} />}
                    <span>{isExecuting ? 'Executing Query...' : 'Run Query'}</span>
                  </button>

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
                    className="btn btn-secondary btn-sm"
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

          {/* QUERY RESULTS SECTION (Appears After Execution) */}
          {execError && (
            <div className="alert-banner alert-banner-error">
              <AlertCircle size={16} />
              <span>{execError}</span>
            </div>
          )}

          {queryResult && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              {/* Query Results Header with Metrics & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TableIcon size={18} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>Query Results</span>
                  
                  {/* Row Count Badge */}
                  <span className="badge badge-primary">
                    {queryResult.row_count} {queryResult.row_count === 1 ? 'Row' : 'Rows'}
                  </span>

                  {/* Execution Latency Badge */}
                  <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    <span>{queryResult.execution_time_ms} ms</span>
                  </span>
                </div>

                {/* Results Actions: Export CSV & Generate Documentation */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleExportCsv}
                    disabled={queryResult.row_count === 0}
                    className="btn btn-secondary btn-sm"
                    title="Export Tabular Data as CSV"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleOpenDocModal}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '6px', fontWeight: 600 }}
                  >
                    <FileText size={13} />
                    <span>Generate Documentation</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Results Table */}
              {queryResult.row_count === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Database size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', margin: 0 }}>
                    Query executed cleanly (0 errors), but returned 0 records matching the filter criteria.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '420px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                        {queryResult.columns.map((col, idx) => (
                          <th 
                            key={idx} 
                            style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 700, 
                              color: 'var(--text-main)', 
                              borderRight: '1px solid var(--border-color)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, rIdx) => (
                        <tr 
                          key={rIdx} 
                          style={{ 
                            borderBottom: '1px solid var(--border-color)',
                            background: rIdx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'
                          }}
                        >
                          {queryResult.columns.map((col, cIdx) => (
                            <td 
                              key={cIdx} 
                              style={{ 
                                padding: '8px 14px', 
                                color: 'var(--text-main)', 
                                borderRight: '1px solid var(--border-color)',
                                fontFamily: typeof row[col] === 'number' ? 'var(--font-mono)' : 'inherit',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span style={{ color: 'var(--text-dark)', fontStyle: 'italic' }}>NULL</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom Telemetry Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '4px' }}>
                <span>Certified safe read-only execution. Maximum 100 rows preview.</span>
                <span>Audited at {new Date(queryResult.executed_at).toLocaleTimeString()}</span>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* DOCUMENTATION GENERATOR & UPDATE MODAL */}
      {showDocModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>SQL Telemetry Documentation Workflow</h2>
              </div>
              <button 
                onClick={() => setShowDocModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Selector Tabs: Create New vs Update Existing */}
            <div className="tab-nav" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setDocMode('create')}
                className={`tab-btn ${docMode === 'create' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <FilePlus size={15} />
                <span>Create New Specification</span>
              </button>
              <button
                type="button"
                onClick={() => setDocMode('update')}
                className={`tab-btn ${docMode === 'update' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Edit3 size={15} />
                <span>Update Existing Document ({existingDocs.length})</span>
              </button>
            </div>

            {/* Loading State for Doc Generation */}
            {isGeneratingDoc ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Synthesizing technical architecture documentation & data schema metrics...</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
                
                {/* MODE A: CREATE NEW DOCUMENT */}
                {docMode === 'create' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '12px' }}>Specification Title</label>
                        <input
                          type="text"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="form-input"
                          style={{ height: '36px', fontSize: '13px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '12px' }}>Document Type</label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="form-input"
                          style={{ height: '36px', fontSize: '13px' }}
                        >
                          <option value="TECH_DESIGN">Technical Design (TECH_DESIGN)</option>
                          <option value="API_DOCS">API Integration Docs (API_DOCS)</option>
                          <option value="SRS">System Requirements (SRS)</option>
                          <option value="BRD">Business Requirements (BRD)</option>
                          <option value="RELEASE_NOTES">Release Notes</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Generated Markdown Documentation Preview</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Full Markdown Compatible</span>
                      </label>
                      <textarea
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        className="form-textarea"
                        style={{ minHeight: '260px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.5' }}
                      />
                    </div>
                  </>
                )}

                {/* MODE B: UPDATE EXISTING DOCUMENT */}
                {docMode === 'update' && (
                  <>
                    {existingDocs.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No existing technical documents found in Knowledge Base to update.</p>
                        <button 
                          onClick={() => setDocMode('create')}
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '8px' }}
                        >
                          Create as New Document Instead
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '12px' }}>Select Target Document to Append / Update</label>
                          <select
                            value={selectedDocId}
                            onChange={(e) => {
                              setSelectedDocId(e.target.value);
                              const match = existingDocs.find(d => d.id === e.target.value);
                              setSelectedDoc(match || null);
                            }}
                            className="form-input"
                            style={{ height: '38px', fontSize: '13px' }}
                          >
                            {existingDocs.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                [{doc.doc_type}] {doc.title} — Author: {doc.author || 'System'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedDoc && (
                          <div className="card-subtle" style={{ padding: '12px 16px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Target Document Metadata:</span>
                              <span className="badge badge-primary">{selectedDoc.doc_type}</span>
                            </div>
                            <p style={{ margin: '0 0 4px 0', color: 'var(--text-muted)' }}>
                              Title: <strong style={{ color: 'var(--text-main)' }}>{selectedDoc.title}</strong>
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                              Existing Size: ~{selectedDoc.content?.length || 0} characters • Created: {new Date(selectedDoc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '12px' }}>
                            Section to Append (Preserves all existing document content)
                          </label>
                          <textarea
                            value={appendSectionPreview}
                            onChange={(e) => setAppendSectionPreview(e.target.value)}
                            className="form-textarea"
                            style={{ minHeight: '180px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.5' }}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

              </div>
            )}

            {/* Modal Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="btn btn-secondary"
                disabled={isSavingDoc || isUpdatingDoc}
              >
                Cancel
              </button>

              {docMode === 'create' ? (
                <button
                  type="button"
                  onClick={handleSaveNewDoc}
                  disabled={isSavingDoc || isGeneratingDoc || !docTitle.trim()}
                  className="btn btn-primary"
                  style={{ gap: '6px' }}
                >
                  {isSavingDoc ? <Loader2 size={15} className="animate-spin" /> : <FileCheck size={15} />}
                  <span>{isSavingDoc ? 'Saving Document...' : 'Save New Document'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUpdateExistingDoc}
                  disabled={isUpdatingDoc || existingDocs.length === 0 || !selectedDocId}
                  className="btn btn-primary"
                  style={{ gap: '6px' }}
                >
                  {isUpdatingDoc ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>{isUpdatingDoc ? 'Applying Update...' : 'Confirm & Append to Document'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
