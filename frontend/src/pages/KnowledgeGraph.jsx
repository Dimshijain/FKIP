import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonBox } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
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
  Loader2,
  AlertCircle,
  ExternalLink,
  Search,
  Zap,
  Eye
} from 'lucide-react';

export default function KnowledgeGraph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const toast = useToast();

  const loadGraphData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.get('/knowledge-graph');
      setGraph(data || { nodes: [], edges: [] });
      if (data?.nodes && data.nodes.length > 0) {
        setSelectedNode(data.nodes[0]);
      }
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

  const filteredNodes = (graph.nodes || []).filter(n => filterType === 'all' || n.type === filterType);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  
  const filteredEdges = (graph.edges || []).filter(e => 
    filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  useEffect(() => {
    if (filteredNodes.length > 0) {
      if (!selectedNode || !filteredNodeIds.has(selectedNode.id)) {
        setSelectedNode(filteredNodes[0]);
      }
    }
  }, [filterType, graph]);

  const calculateNodePositions = (nodesList) => {
    const types = ['document', 'oracle_object', 'dna_feature', 'opportunity'];
    const clusters = {};
    types.forEach(t => clusters[t] = []);
    
    nodesList.forEach(n => {
      if (clusters[n.type]) {
        clusters[n.type].push(n);
      } else {
        clusters['document'].push(n);
      }
    });

    const positions = {};
    
    const clusterCenters = {
      'document': { x: 280, y: 190 },
      'oracle_object': { x: 770, y: 190 },
      'dna_feature': { x: 770, y: 510 },
      'opportunity': { x: 280, y: 510 }
    };

    types.forEach(type => {
      const list = clusters[type];
      const center = clusterCenters[type];
      const count = list.length;
      
      if (count === 0) return;

      if (count === 1) {
        positions[list[0].id] = { x: center.x, y: center.y, angle: 0, center };
      } else if (count <= 6) {
        const radius = 105;
        list.forEach((node, index) => {
          const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
          positions[node.id] = {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
            angle,
            center
          };
        });
      } else {
        const innerCount = Math.min(5, Math.ceil(count / 2));
        const outerCount = count - innerCount;
        const innerRadius = 75;
        const outerRadius = 145;

        list.forEach((node, index) => {
          if (index < innerCount) {
            const angle = (index / innerCount) * 2 * Math.PI - Math.PI / 2;
            positions[node.id] = {
              x: center.x + innerRadius * Math.cos(angle),
              y: center.y + innerRadius * Math.sin(angle),
              angle,
              center
            };
          } else {
            const outerIndex = index - innerCount;
            const angle = (outerIndex / outerCount) * 2 * Math.PI - Math.PI / 2 + (Math.PI / outerCount);
            positions[node.id] = {
              x: center.x + outerRadius * Math.cos(angle),
              y: center.y + outerRadius * Math.sin(angle),
              angle,
              center
            };
          }
        });
      }
    });

    return positions;
  };

  const nodePositions = calculateNodePositions(filteredNodes);

  const getNodeColor = (type) => {
    switch (type) {
      case 'document': return 'var(--color-secondary)';
      case 'oracle_object': return 'var(--color-primary)';
      case 'dna_feature': return 'var(--color-accent)';
      case 'opportunity': return 'var(--status-completed)';
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

  const handleSelectNode = (node) => {
    setSelectedNode(node);
  };

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <Network size={28} className="page-title-icon" />
              <span>Connected Knowledge Graph</span>
            </h1>
            <span className="badge badge-primary">Interactive Topology</span>
          </div>
          <p className="page-subtitle">
            Visualize relational mappings and explore connections between documentation, database schemas, applications, and innovation milestones.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={loadGraphData} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Reload Graph</span>
          </button>
        </div>
      </div>

      {/* Standardized Alert */}
      {error && (
        <div className="alert-banner alert-banner-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Control panel & Clean Legend */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: '16px', padding: '14px 20px' }}>
        {/* Filter buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
            <Filter size={15} />
            <span>Filter Nodes:</span>
          </div>
          
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'document', 'oracle_object', 'dna_feature', 'opportunity'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={`badge ${filterType === type ? 'badge-primary' : 'badge-secondary'}`}
                style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '11px', textTransform: 'uppercase' }}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Documents</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Oracle Objects</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Core Banking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-completed)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Opportunities</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
          
          {/* Node Link Canvas */}
          <div className="card" style={{ padding: '12px', background: 'var(--bg-input)', position: 'relative', overflow: 'hidden' }}>
            
            <svg viewBox="0 0 1050 700" style={{ width: '100%', height: 'auto', background: 'transparent' }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 2 L 10 5 L 0 8 z" fill="rgba(255,255,255,0.2)" />
                </marker>
              </defs>

              {/* Draw Connection Edges */}
              {filteredEdges.map(edge => {
                const start = nodePositions[edge.source];
                const end = nodePositions[edge.target];
                if (!start || !end) return null;
                
                const isConnected = (selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target)) ||
                                    (hoveredNode && (hoveredNode.id === edge.source || hoveredNode.id === edge.target));

                return (
                  <line 
                    key={edge.id}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={isConnected ? 'var(--color-primary)' : 'var(--border-color)'}
                    strokeWidth={isConnected ? 2.5 : 1.2}
                    strokeOpacity={isConnected ? 0.9 : 0.5}
                    markerEnd="url(#arrow)"
                    strokeDasharray={edge.type === 'depends_on' ? '4 3' : 'none'}
                  />
                );
              })}

              {/* Draw Nodes */}
              {filteredNodes.map(node => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode?.id === node.id;
                
                const cos = Math.cos(pos.angle || 0);
                const sin = Math.sin(pos.angle || 0);

                let textAnchor = 'middle';
                if (cos > 0.3) textAnchor = 'start';
                else if (cos < -0.3) textAnchor = 'end';

                const labelOffsetX = cos * 22;
                const labelOffsetY = sin * 22 + (sin < -0.3 ? -6 : sin > 0.3 ? 12 : 4);
                const displayLabel = node.label.length > 18 ? node.label.substring(0, 15) + '...' : node.label;

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => handleSelectNode(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle 
                      r={30} 
                      fill="rgba(255,255,255,0.001)"
                      onClick={(e) => { e.stopPropagation(); handleSelectNode(node); }}
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    />

                    {(isSelected || isHovered) && (
                      <circle 
                        r={22} 
                        fill="transparent"
                        stroke={getNodeColor(node.type)}
                        strokeWidth={2}
                        strokeOpacity={0.8}
                        style={{ filter: 'drop-shadow(0 0 6px ' + getNodeColor(node.type) + ')' }}
                        onClick={(e) => { e.stopPropagation(); handleSelectNode(node); }}
                      />
                    )}
                    
                    <circle 
                      r={14} 
                      fill="var(--bg-surface)" 
                      stroke={getNodeColor(node.type)} 
                      strokeWidth={2.5}
                      onClick={(e) => { e.stopPropagation(); handleSelectNode(node); }}
                    />
                    
                    <g transform="translate(-7, -7)" style={{ color: getNodeColor(node.type) }} onClick={(e) => { e.stopPropagation(); handleSelectNode(node); }}>
                      {getNodeIcon(node.type)}
                    </g>

                    <text
                      x={labelOffsetX}
                      y={labelOffsetY}
                      textAnchor={textAnchor}
                      fill={isSelected || isHovered ? 'var(--text-main)' : 'var(--text-muted)'}
                      fontSize={isSelected || isHovered ? '11px' : '10px'}
                      fontWeight={isSelected || isHovered ? '700' : '500'}
                      onClick={(e) => { e.stopPropagation(); handleSelectNode(node); }}
                      style={{ 
                        cursor: 'pointer',
                        pointerEvents: 'all'
                      }}
                    >
                      {isHovered ? node.label : displayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Details Sidebar panel */}
          <div className="card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <div className="section-header">
              <h3 className="section-title">
                <Info size={18} className="section-title-icon" />
                <span>Node Details</span>
              </h3>
            </div>

            {!selectedNode ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '60px 0' }}>
                <Network size={40} style={{ opacity: 0.15, margin: '0 auto 16px auto' }} />
                <p style={{ fontSize: '13px', lineHeight: 1.6 }}>Select a node in the visualizer to explore properties.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
                  <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>
                    {selectedNode.type.replace('_', ' ')}
                  </span>
                </div>

                <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedNode.label}
                </h4>

                <div className="card-subtle" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {Object.entries(selectedNode.metadata || {}).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}:</span>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word', textAlign: 'right', color: 'var(--text-main)' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>Network Connections</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <div>Outbound Dependencies: <strong style={{ color: 'var(--text-main)' }}>{(graph.edges || []).filter(e => e.source === selectedNode.id).length} nodes</strong></div>
                    <div>Inbound References: <strong style={{ color: 'var(--text-main)' }}>{(graph.edges || []).filter(e => e.target === selectedNode.id).length} nodes</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Node List Selector for Accessibility */}
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Quick Node Selector:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                {filteredNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => handleSelectNode(node)}
                    className={`badge ${selectedNode?.id === node.id ? 'badge-primary' : 'badge-secondary'}`}
                    style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '10px' }}
                  >
                    {node.label.length > 12 ? node.label.substring(0, 10) + '..' : node.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
