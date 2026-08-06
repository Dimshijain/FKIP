import React from 'react';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) => (
  <div
    className="skeleton-shimmer"
    style={{
      width,
      height,
      borderRadius,
      ...style,
    }}
  />
);

export const SkeletonCard = ({ count = 1 }) => (
  <div className="skeleton-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card skeleton-card-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <SkeletonBox width="40px" height="40px" borderRadius="10px" />
          <div style={{ flex: 1 }}>
            <SkeletonBox width="60%" height="16px" style={{ marginBottom: '8px' }} />
            <SkeletonBox width="35%" height="12px" />
          </div>
        </div>
        <SkeletonBox width="100%" height="14px" style={{ marginBottom: '8px' }} />
        <SkeletonBox width="85%" height="14px" style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBox width="30%" height="24px" borderRadius="12px" />
          <SkeletonBox width="20%" height="14px" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
      {Array.from({ length: cols }).map((_, c) => (
        <SkeletonBox key={c} width={`${100 / cols}%`} height="18px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        style={{
          padding: '16px 24px',
          borderBottom: r < rows - 1 ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonBox key={c} width={`${100 / cols}%`} height="16px" />
        ))}
      </div>
    ))}
  </div>
);

export default SkeletonBox;
