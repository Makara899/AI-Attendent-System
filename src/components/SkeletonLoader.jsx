import React from 'react';

// Reusable spinner component
export function Spinner({ size = 20, color = 'var(--accent)', className = '' }) {
  return (
    <div 
      className={`cyber-spinner ${className}`}
      style={{
        width: size,
        height: size,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderTopColor: color,
      }}
      aria-label="Loading..."
    />
  );
}

// Table Rows Skeleton Loader
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-table-wrap">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-line skeleton-header-cell" />
        ))}
      </div>
      <div className="skeleton-table-body">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="skeleton-table-row">
            {Array.from({ length: cols }).map((_, c) => (
              <div 
                key={c} 
                className="skeleton-line skeleton-cell" 
                style={{ width: c === 0 ? '40px' : c === 1 ? '70%' : '50%' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Student Grid Cards Skeleton Loader
export function StudentCardSkeleton({ count = 6 }) {
  return (
    <div className="student-grid-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-student-card">
          <div className="skeleton-avatar-wrap">
            <div className="skeleton-avatar" />
          </div>
          <div className="skeleton-info-wrap">
            <div className="skeleton-line title" style={{ width: '65%' }} />
            <div className="skeleton-line code" style={{ width: '40%' }} />
            <div className="skeleton-line tag" style={{ width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard Full Skeleton Loader
export function DashboardSkeleton({ language = 'kh' }) {
  const isKh = language === 'kh';
  return (
    <div className="dashboard-skeleton-wrap">
      {/* Hero Banner Skeleton */}
      <div className="skeleton-hero-banner">
        <div className="skeleton-line pill" style={{ width: '140px', height: '24px' }} />
        <div className="skeleton-line title" style={{ width: '45%', height: '32px', marginTop: '12px' }} />
        <div className="skeleton-row" style={{ marginTop: '14px', gap: '10px' }}>
          <div className="skeleton-line chip" style={{ width: '120px', height: '28px' }} />
          <div className="skeleton-line chip" style={{ width: '100px', height: '28px' }} />
          <div className="skeleton-line chip" style={{ width: '180px', height: '28px' }} />
        </div>
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="skeleton-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-row justify-between">
              <div className="skeleton-line label" style={{ width: '45%', height: '16px' }} />
              <div className="skeleton-stat-icon" />
            </div>
            <div className="skeleton-line number" style={{ width: '60px', height: '36px', margin: '14px 0 8px' }} />
            <div className="skeleton-line subtext" style={{ width: '80%', height: '14px' }} />
          </div>
        ))}
      </div>

      {/* Two-Column Content Skeleton */}
      <div className="skeleton-grid-2col">
        <div className="skeleton-panel">
          <div className="skeleton-line header" style={{ width: '40%', height: '22px', marginBottom: '16px' }} />
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="skeleton-list-item">
              <div className="skeleton-avatar-sm" />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '6px' }} />
                <div className="skeleton-line" style={{ width: '35%', height: '12px' }} />
              </div>
              <div className="skeleton-line badge" style={{ width: '60px', height: '22px' }} />
            </div>
          ))}
        </div>

        <div className="skeleton-panel">
          <div className="skeleton-line header" style={{ width: '50%', height: '22px', marginBottom: '16px' }} />
          <div className="skeleton-chart-box">
            <div className="skeleton-chart-ring" />
          </div>
        </div>
      </div>
    </div>
  );
}
