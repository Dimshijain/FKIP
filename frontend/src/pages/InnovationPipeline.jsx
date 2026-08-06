import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { useToast } from '../components/ToastContext';
import EmptyState from '../components/EmptyState';
import { 
  Lightbulb, 
  Layers, 
  Compass, 
  Cpu, 
  ArrowRight, 
  Check, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  FileText,
  Filter,
  Plus,
  Zap,
  DollarSign
} from 'lucide-react';

export default function InnovationPipeline() {
  const [documents, setDocuments] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const userRole = getUserRole() || 'CONSUMER';
  const toast = useToast();

  const loadInitialData = async () => {
    try {
      const [docs, opps] = await Promise.all([
        api.getDocuments(),
        api.get('/innovation/opportunities')
      ]);
      setDocuments(docs);
      setOpportunities(opps);
    } catch (err) {
      console.error(err);
      setError('Failed to query catalog assets or opportunities log.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleDocSelect = (docId) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(selectedDocIds.filter(id => id !== docId));
    } else {
      setSelectedDocIds([...selectedDocIds, docId]);
    }
  };

  const handleAnalyze = async () => {
    if (selectedDocIds.length === 0) {
      setError('Please select at least one document to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setSuccess('');
    setAnalysisResult(null);

    try {
      const res = await api.post('/innovation/analyze', { document_ids: selectedDocIds });
      setAnalysisResult(res);
      setSuccess('Successfully audited document content for technological gaps.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Auditing failed. Please check local LLM connectivity.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApprove = async (idea) => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: idea.name,
        description: idea.description,
        source_type: 'GENERAL',
        business_value: idea.business_value,
        complexity: idea.complexity,
        priority: idea.priority,
        status: 'BACKLOG'
      };
      
      const savedOpp = await api.post('/innovation/opportunities', payload);
      setOpportunities([savedOpp, ...opportunities]);
      setSuccess(`Opportunity "${idea.name}" approved and promoted to the product registry.`);
      
      // Remove approved idea from analysis results
      if (analysisResult) {
        setAnalysisResult({
          ...analysisResult,
          ideas: analysisResult.ideas.filter(i => i.name !== idea.name)
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Promotion failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus, currentPriority) => {
    try {
      const res = await api.put(`/innovation/opportunities/${id}?status_val=${newStatus}&priority_val=${currentPriority}`);
      setOpportunities(opportunities.map(o => o.id === id ? res : o));
      setSuccess(`Opportunity status updated to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      setError('Failed to update opportunity status.');
    }
  };

  const handleDeleteOpp = async (id) => {
    try {
      await api.delete(`/innovation/opportunities/${id}`);
      setOpportunities(opportunities.filter(o => o.id !== id));
      setSuccess('Opportunity removed from backlog.');
    } catch (err) {
      console.error(err);
      setError('Failed to delete opportunity.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Product Opportunity Register</h1>
        <p style={{ color: 'var(--text-muted)' }}>Analyze ingested text logs to discover development gaps, map AI scoring indicators, and prioritize the product innovation backlog.</p>
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
          <AlertTriangle size={18} />
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

      {/* Main Grid split: Left Column (Analyzer), Right Column (Backlog Kanban) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Gaps Analyzer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Document selection */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Gap Discovery Engine</span>
            </h3>
            
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No documents uploaded. Please add knowledge assets on the Dashboard first.</p>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Select documents to process for gap audits:</p>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {documents.map(doc => (
                    <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => handleDocSelect(doc.id)}
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>{doc.filename}</span>
                    </label>
                  ))}
                </div>
                
                {userRole === 'CONSUMER' ? (
                  <p style={{ color: 'var(--status-failed)', fontSize: '12px' }}>Viewer accounts cannot start gap audits.</p>
                ) : (
                  <button 
                    onClick={handleAnalyze} 
                    className="btn btn-primary btn-full"
                    disabled={isAnalyzing || selectedDocIds.length === 0}
                    style={{ gap: '8px' }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Analyzing with Ollama...</span>
                      </>
                    ) : (
                      <>
                        <Cpu size={16} />
                        <span>Trigger AI Gap Analysis</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Analysis Results Display */}
          {analysisResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Discovered Gaps */}
              <div className="card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
                <h4 style={{ fontSize: '15px', color: 'var(--status-pending)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} />
                  <span>Discovered System Gaps</span>
                </h4>
                <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {analysisResult.gaps.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>

              {/* Proposed Opportunities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600 }}>Proposed Innovation Ideas</h4>
                {analysisResult.ideas.map((idea, idx) => (
                  <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <h5 style={{ fontSize: '15px', fontWeight: 700 }}>{idea.name}</h5>
                      <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Priority {idea.priority}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {idea.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                      <div>Value: <span style={{ fontWeight: 600, color: 'var(--status-completed)' }}>{idea.business_value}</span></div>
                      <div>Complexity: <span style={{ fontWeight: 600, color: 'var(--status-pending)' }}>{idea.complexity}</span></div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-dark)' }}>
                      <strong>Impact</strong>: {idea.impact_assessment}
                    </div>

                    <button 
                      onClick={() => handleApprove(idea)} 
                      className="btn btn-secondary btn-full"
                      disabled={isSaving}
                      style={{ gap: '6px', padding: '8px', fontSize: '12px' }}
                    >
                      <Check size={14} />
                      <span>Approve & Promote to Backlog</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Opportunities Kanban Backlog */}
        <div className="card" style={{ minHeight: '400px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={18} style={{ color: 'var(--color-secondary)' }} />
            <span>Opportunities Pipeline</span>
          </h3>

          {opportunities.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '80px 0' }}>
              <Lightbulb size={48} style={{ opacity: 0.1, margin: '0 auto 16px auto' }} />
              <p>No prioritized opportunities found. Run a Gap Analysis on files to discover pipeline items.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {opportunities.map((opp) => (
                <div 
                  key={opp.id} 
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.01)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', background: 'var(--bg-input)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {opp.opp_code}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Priority selector */}
                      <select 
                        value={opp.priority}
                        onChange={(e) => handleStatusChange(opp.id, opp.status, e.target.value)}
                        className="form-select"
                        style={{ padding: '2px 6px', fontSize: '11px', width: '80px' }}
                      >
                        <option value="P1">P1 (High)</option>
                        <option value="P2">P2 (Med)</option>
                        <option value="P3">P3 (Low)</option>
                      </select>

                      {/* Status selector */}
                      <select 
                        value={opp.status} 
                        onChange={(e) => handleStatusChange(opp.id, e.target.value, opp.priority)}
                        className="form-select"
                        style={{ padding: '2px 6px', fontSize: '11px', width: '110px' }}
                      >
                        <option value="BACKLOG">BACKLOG</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="VALIDATING">VALIDATING</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                      
                      {userRole !== 'CONSUMER' && (
                        <button 
                          onClick={() => handleDeleteOpp(opp.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.target.style.color = 'var(--status-failed)'}
                          onMouseLeave={(e) => e.target.style.color = 'var(--text-dark)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{opp.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{opp.description}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-dark)' }}>
                    <span>Value: <strong style={{ color: 'var(--status-completed)' }}>{opp.business_value}</strong></span>
                    <span>Complexity: <strong style={{ color: 'var(--status-pending)' }}>{opp.complexity}</strong></span>
                  </div>
                </div>
              ))}
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
