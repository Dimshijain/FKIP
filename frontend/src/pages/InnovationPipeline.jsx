import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonCard, SkeletonList } from '../components/SkeletonLoader';
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
  DollarSign,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function InnovationPipeline() {
  const [documents, setDocuments] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userRole = getUserRole() || 'CONSUMER';
  const toast = useToast();

  const loadInitialData = async () => {
    try {
      const [docs, opps] = await Promise.all([
        api.getDocuments(),
        api.get('/innovation/opportunities')
      ]);
      setDocuments(docs || []);
      setOpportunities(opps || []);
    } catch (err) {
      console.error(err);
      setError('Failed to query catalog assets or opportunities log.');
    } finally {
      setIsLoading(false);
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
      toast.success('Document audit complete. Gaps & proposed opportunities ready.');
    } catch (err) {
      console.error(err);
      const errMsg = err.message || 'Auditing failed. Please check local LLM connectivity.';
      setError(errMsg);
      toast.error(errMsg);
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
      toast.success(`Promoted "${idea.name}" to backlog.`);
      
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
      toast.success(`Opportunity status updated to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      setError('Failed to update opportunity status.');
    }
  };

  const handleDeleteOpp = async (id) => {
    try {
      await api.delete(`/innovation/opportunities/${id}`);
      setOpportunities(opportunities.filter(o => o.id !== id));
      toast.info('Opportunity removed from backlog.');
    } catch (err) {
      console.error(err);
      setError('Failed to delete opportunity.');
    }
  };

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <Lightbulb size={28} className="page-title-icon" />
              <span>Product Opportunity Register</span>
            </h1>
            <span className="badge badge-primary">Innovation Backlog</span>
          </div>
          <p className="page-subtitle">
            Analyze ingested text logs to discover development gaps, map AI scoring indicators, and prioritize the product innovation backlog.
          </p>
        </div>
      </div>

      {/* Standardized Alerts */}
      {error && (
        <div className="alert-banner alert-banner-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-banner alert-banner-success">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid split: Left Column (Analyzer), Right Column (Backlog Kanban) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Gaps Analyzer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Document selection */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <Compass size={20} className="section-title-icon" />
                <span>Gap Discovery Engine</span>
              </h3>
              <span className="badge badge-secondary">{selectedDocIds.length} Selected</span>
            </div>
            
            {isLoading ? (
              <SkeletonList items={3} />
            ) : documents.length === 0 ? (
              <EmptyState title="No Ingested Documents" description="Please upload knowledge files on the Dashboard to run Gap Audits." />
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                  Select documents to process for technological gap discovery:
                </p>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-5)' }}>
                  {documents.map(doc => (
                    <label 
                      key={doc.id} 
                      className="card-subtle"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        cursor: 'pointer', 
                        padding: '10px 14px',
                        background: selectedDocIds.includes(doc.id) ? 'var(--color-primary-subtle)' : 'var(--card-subtle-bg)',
                        borderLeft: selectedDocIds.includes(doc.id) ? '3px solid var(--color-primary)' : '1px solid var(--border-color)'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => handleDocSelect(doc.id)}
                        style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>
                        {doc.filename}
                      </span>
                    </label>
                  ))}
                </div>
                
                {userRole === 'CONSUMER' ? (
                  <p style={{ color: 'var(--status-failed)', fontSize: '12px' }}>Viewer accounts cannot start gap audits.</p>
                ) : (
                  <button 
                    onClick={handleAnalyze} 
                    className="btn btn-primary"
                    disabled={isAnalyzing || selectedDocIds.length === 0}
                    style={{ width: '100%', gap: '8px' }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Analyzing with Ollama...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Discovered Gaps */}
              <div className="card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
                <h4 style={{ fontSize: '15px', color: 'var(--status-pending)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <AlertTriangle size={16} />
                  <span>Discovered System Gaps ({analysisResult.gaps?.length || 0})</span>
                </h4>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {analysisResult.gaps?.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>

              {/* Proposed Opportunities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Proposed Innovation Ideas</h4>
                {analysisResult.ideas?.map((idea, idx) => (
                  <div key={idx} className="card-subtle" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 'var(--space-5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px' }}>
                      <h5 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{idea.name}</h5>
                      <span className="badge badge-primary">
                        Priority {idea.priority}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {idea.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                      <div>Value: <span style={{ fontWeight: 700, color: 'var(--status-completed)' }}>{idea.business_value}</span></div>
                      <div>Complexity: <span style={{ fontWeight: 700, color: 'var(--status-pending)' }}>{idea.complexity}</span></div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-dark)' }}>
                      <strong>Impact</strong>: {idea.impact_assessment}
                    </div>

                    <button 
                      onClick={() => handleApprove(idea)} 
                      className="btn btn-secondary btn-sm"
                      disabled={isSaving}
                      style={{ gap: '6px' }}
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
        <div className="card" style={{ minHeight: '480px' }}>
          <div className="section-header">
            <h3 className="section-title">
              <Lightbulb size={20} className="section-title-icon" />
              <span>Opportunities Pipeline</span>
            </h3>
            <span className="badge badge-secondary">{opportunities.length} Items</span>
          </div>

          {isLoading ? (
            <SkeletonList items={4} />
          ) : opportunities.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '80px 0' }}>
              <Lightbulb size={48} style={{ opacity: 0.15, margin: '0 auto 16px auto', color: 'var(--color-primary)' }} />
              <p style={{ fontSize: '14px' }}>No prioritized opportunities found. Run a Gap Analysis on files to discover pipeline items.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {opportunities.map((opp) => (
                <div 
                  key={opp.id} 
                  className="card-subtle"
                  style={{
                    padding: 'var(--space-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderLeft: opp.priority === 'P1' ? '4px solid var(--status-failed)' : opp.priority === 'P2' ? '4px solid var(--status-pending)' : '4px solid var(--color-primary)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="badge badge-secondary" style={{ fontFamily: 'var(--font-mono)' }}>
                      {opp.opp_code}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Priority selector */}
                      <select 
                        value={opp.priority}
                        onChange={(e) => handleStatusChange(opp.id, opp.status, e.target.value)}
                        className="form-select"
                        style={{ height: '28px', fontSize: '11px', padding: '0 6px', width: 'auto' }}
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
                        style={{ height: '28px', fontSize: '11px', padding: '0 6px', width: 'auto' }}
                      >
                        <option value="BACKLOG">BACKLOG</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="VALIDATING">VALIDATING</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                      
                      {userRole !== 'CONSUMER' && (
                        <button 
                          onClick={() => handleDeleteOpp(opp.id)}
                          className="btn-icon btn-icon-sm"
                          title="Delete Opportunity"
                        >
                          <Trash2 size={13} style={{ color: 'var(--status-failed)' }} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{opp.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{opp.description}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-dark)' }}>
                    <span>Value: <strong style={{ color: 'var(--status-completed)' }}>{opp.business_value}</strong></span>
                    <span>Complexity: <strong style={{ color: 'var(--status-pending)' }}>{opp.complexity}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
