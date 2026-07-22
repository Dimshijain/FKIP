import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Network, 
  Layers, 
  FileText, 
  Database, 
  AppWindow, 
  Lightbulb,
  Filter,
  RefreshCw,
  Info,
  Loader2
} from 'lucide-react';

export default function KnowledgeGraph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'document', 'oracle_object', 'dna_feature', 'opportunity'
  const [error, setError] = useState('');

  const loadGraphData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.get('/knowledge-graph');
      setGraph(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch connected knowledge graph. Please verify API is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, []);

  // Filtered nodes & edges list
  const filteredNodes = graph.nodes.filter(n => filterType === 'all' || n.type === filterType);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  
  const filteredEdges = graph.edges.filter(e => 
    filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  // Layout calculation: Assign coordinate points based on circular groups
  const calculateNodePositions = (nodesList) => {
    const width = 600;
    const height = 400;
    const cx = width / 2;
    const cy = height / 2;
    
    // Group nodes by type to create structured clusters
    const types = ['document', 'oracle_object', 'dna_feature', 'opportunity'];
    const clusters = {};
    types.forEach(t => clusters[t] = []);
    
    nodesList.forEach(n => {
      if (clusters[n.type]) {
        clusters[n.type].push(n);
      } else {
        clusters['document'].push(n); // fallback
      }
    });

    const positions = {};
    
    // Assign cluster centers in a large square configuration
    const clusterCenters = {
      'document': { x: cx - 180, y: cy - 100 },
      'oracle_object': { x: cx + 180, y: cy - 100 },
      'dna_feature': { x: cx + 180, y: cy + 100 },
      'opportunity': { x: cx - 180, y: cy + 100 }
    };

    types.forEach(type => {
      const list = clusters[type];
      const center = clusterCenters[type];
      const count = list.length;
      
      list.forEach((node, index) => {
        if (count === 1) {
          positions[node.id] = { x: center.x, y: center.y };
        } else {
          // Arrange in a small circle around cluster center
          const radius = 50;
          const angle = (index / count) * 2 * Math.PI;
          positions[node.id] = {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
          };
        }
      });
    });

    return positions;
  };

  const nodePositions = calculateNodePositions(filteredNodes);

  const getNodeColor = (type) => {
    switch (type) {
      case 'document': return 'var(--color-secondary)';   // Neon Cyan
      case 'oracle_object': return 'var(--color-primary)'; // Electric Indigo
      case 'dna_feature': return 'var(--color-accent)';    // Electric Purple
      case 'opportunity': return 'var(--status-completed)'; // Emerald Green
      default: return 'var(--text-muted)';
    }
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case 'document': return <FileText size={14} />;
      case 'oracle_object': return <Database size={14} />;
      case 'dna_feature': return <AppWindow size={14} />;
      case 'opportunity': return <Lightbulb size={14} />;
      default: return <Info size={14} />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Connected Knowledge Graph</h1>
          <p style={{ color: 'var(--text-muted)' }}>Visualize relational mappings and explorer connections between documentation, database schemas, applications, and innovation milestones.</p>
        </div>
        <button onClick={loadGraphData} className="btn btn-secondary" style={{ gap: '8px' }}>
          <RefreshCw size={16} />
          <span>Reload Graph</span>
        </button>
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
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Control panel: filter controls */}
      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
          <Filter size={16} />
          <span>Filter Node Types:</span>
        </div>
        
        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'document', 'oracle_object', 'dna_feature', 'opportunity'].map(type => (
            <button 
              key={type}
              onClick={() => { setFilterType(type); setSelectedNode(null); }}
              className={`btn ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              {type.toUpperCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          
          {/* Node Link Canvas */}
          <div className="card" style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', borderRadius: '12px', position: 'relative' }}>
            {/* Visual labels overlay */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>Documents (Catalog)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>Oracle Schemas (DDL)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>Core Banking Features (Specs)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-completed)' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>Innovation Opportunities</span>
              </div>
            </div>

            <svg viewBox="0 0 600 400" style={{ width: '100%', height: 'auto', background: 'transparent' }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 2 L 10 5 L 0 8 z" fill="rgba(255,255,255,0.15)" />
                </marker>
              </defs>

              {/* Draw Edges */}
              {filteredEdges.map(edge => {
                const start = nodePositions[edge.source];
                const end = nodePositions[edge.target];
                if (!start || !end) return null;
                
                return (
                  <line 
                    key={edge.id}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                    strokeDasharray={edge.type === 'depends_on' ? '4 2' : 'none'}
                  />
                );
              })}

              {/* Draw Nodes */}
              {filteredNodes.map(node => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                
                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(node)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Glow outline */}
                    <circle 
                      r={isSelected ? 18 : 14} 
                      fill="transparent"
                      stroke={getNodeColor(node.type)}
                      strokeWidth={isSelected ? 3 : 1}
                      strokeOpacity={isSelected ? 0.8 : 0.2}
                    />
                    
                    {/* Core node */}
                    <circle 
                      r={12} 
                      fill="var(--bg-sidebar)" 
                      stroke={getNodeColor(node.type)} 
                      strokeWidth={2}
                    />
                    
                    {/* Icon wrapper */}
                    <g transform="translate(-7, -7)" style={{ color: getNodeColor(node.type) }}>
                      {getNodeIcon(node.type)}
                    </g>

                    {/* Small text label */}
                    <text
                      y={26}
                      textAnchor="middle"
                      fill={isSelected ? 'var(--text-main)' : 'var(--text-muted)'}
                      fontSize={isSelected ? '10px' : '9px'}
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Details Sidebar panel */}
          <div className="card" style={{ minHeight: '400px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
              <Info size={18} />
              <span>Node Details</span>
            </h3>

            {!selectedNode ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '80px 0' }}>
                <Network size={40} style={{ opacity: 0.1, margin: '0 auto 16px auto' }} />
                <p>Click on any node in the knowledge network visualizer to explore its properties and connections.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header Tag */}
                <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', color: getNodeColor(selectedNode.type), fontWeight: 700, textTransform: 'uppercase' }}>
                    {selectedNode.type.replace('_', ' ')}
                  </span>
                </div>

                {/* Name */}
                <h4 style={{ fontSize: '18px', fontWeight: 700 }}>
                  {selectedNode.label}
                </h4>

                {/* Metadata properties */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                  {Object.entries(selectedNode.metadata || {}).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k.replace('_', ' ')}:</span>
                      <span style={{ fontWeight: 600 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Relations details */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Network Connections</h5>
                  {/* Incoming/Outgoing Counts */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <div>Dependencies: <strong>{graph.edges.filter(e => e.source === selectedNode.id).length} nodes</strong></div>
                    <div>Referenced by: <strong>{graph.edges.filter(e => e.target === selectedNode.id).length} nodes</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
