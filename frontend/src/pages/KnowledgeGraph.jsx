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
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function KnowledgeGraph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
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

  // Layout calculation: Spaced-out 1050x700 Canvas with Multi-Ring Spacing
  const calculateNodePositions = (nodesList) => {
    const width = 1050;
    const height = 700;
    
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
    
    // Wide cluster centers across 4 distinct canvas quadrants
    const clusterCenters = {
      'document': { x: 280, y: 200 },
      'oracle_object': { x: 770, y: 200 },
      'dna_feature': { x: 770, y: 520 },
      'opportunity': { x: 280, y: 520 }
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
        // Multi-ring layout for large node sets (e.g. 12+ documents) to prevent text collision
        const innerCount = Math.min(5, Math.ceil(count / 2));
        const outerCount = count - innerCount;
        const innerRadius = 75;
        const outerRadius = 150;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
          marginBottom: '24px',
          fontSize: '14px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Control panel & Clean Legend */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', padding: '14px 24px' }}>
        {/* Filter buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
            <Filter size={16} />
            <span>Filter Node Types:</span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-secondary)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Documents</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Oracle Objects</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Core Banking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-completed)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Opportunities</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: '24px' }}>
          
          {/* Node Link Canvas */}
          <div className="card" style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
            
            <svg viewBox="0 0 1050 700" style={{ width: '100%', height: 'auto', background: 'transparent' }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 2 L 10 5 L 0 8 z" fill="rgba(255,255,255,0.18)" />
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
                    stroke={isConnected ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.12)'}
                    strokeWidth={isConnected ? 2.5 : 1.2}
                    strokeOpacity={isConnected ? 0.9 : 0.4}
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
                
                // Outward-facing label calculation to eliminate label collisions
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
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulsing selection / hover ring */}
                    {(isSelected || isHovered) && (
                      <circle 
                        r={22} 
                        fill="transparent"
                        stroke={getNodeColor(node.type)}
                        strokeWidth={2}
                        strokeOpacity={0.8}
                        style={{ filter: 'drop-shadow(0 0 6px ' + getNodeColor(node.type) + ')' }}
                      />
                    )}
                    
                    {/* Core node circle */}
                    <circle 
                      r={14} 
                      fill="var(--bg-sidebar)" 
                      stroke={getNodeColor(node.type)} 
                      strokeWidth={2.5}
                    />
                    
                    {/* Icon wrapper */}
                    <g transform="translate(-7, -7)" style={{ color: getNodeColor(node.type) }}>
                      {getNodeIcon(node.type)}
                    </g>

                    {/* Clean outward text label */}
                    <text
                      x={labelOffsetX}
                      y={labelOffsetY}
                      textAnchor={textAnchor}
                      fill={isSelected || isHovered ? 'var(--text-main)' : 'rgba(241, 245, 249, 0.85)'}
                      fontSize={isSelected || isHovered ? '11px' : '10px'}
                      fontWeight={isSelected || isHovered ? '700' : '500'}
                      style={{ 
                        pointerEvents: 'none',
                        textShadow: '0px 1px 4px rgba(0,0,0,0.9)'
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
          <div className="card" style={{ minHeight: '400px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
              <Info size={18} />
              <span>Node Details</span>
            </h3>

            {!selectedNode ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '80px 0' }}>
                <Network size={40} style={{ opacity: 0.15, margin: '0 auto 16px auto' }} />
                <p style={{ fontSize: '13px', lineHeight: 1.6 }}>Click on any node in the knowledge network visualizer to explore its properties and connections.</p>
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
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}:</span>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word', textAlign: 'right' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Relations details */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Network Connections</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <div>Dependencies: <strong style={{ color: 'var(--text-main)' }}>{graph.edges.filter(e => e.source === selectedNode.id).length} nodes</strong></div>
                    <div>Referenced by: <strong style={{ color: 'var(--text-main)' }}>{graph.edges.filter(e => e.target === selectedNode.id).length} nodes</strong></div>
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
