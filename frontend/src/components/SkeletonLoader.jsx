import React from 'react';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', style = {} }) => (
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
      <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBox width="45%" height="14px" />
          <SkeletonBox width="36px" height="36px" borderRadius="var(--radius-sm)" />
        </div>
        <SkeletonBox width="60%" height="32px" style={{ margin: '4px 0' }} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SkeletonBox width="50px" height="18px" borderRadius="var(--radius-full)" />
          <SkeletonBox width="55%" height="12px" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="table-container">
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', background: 'var(--bg-surface)' }}>
      {Array.from({ length: cols }).map((_, c) => (
        <SkeletonBox key={c} width={`${100 / cols}%`} height="14px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        style={{
          padding: '16px 20px',
          borderBottom: r < rows - 1 ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          gap: '16px',
          background: r % 2 === 1 ? 'var(--card-subtle-bg)' : 'transparent'
        }}
      >
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonBox key={c} width={`${100 / cols}%`} height="14px" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ items = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox width="40%" height="16px" />
        <SkeletonBox width="60px" height="20px" borderRadius="var(--radius-full)" />
      </div>
    ))}
  </div>
);
