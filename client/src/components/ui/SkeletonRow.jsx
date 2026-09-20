import React from 'react';
import './Skeleton.css';

export const SkeletonRow = ({ columns = 5 }) => {
  return (
    <tr className="skeleton-tr">
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="skeleton-td">
          <div className="skeleton-pulse" style={{ width: idx === 1 ? '70%' : '50%' }} />
        </td>
      ))}
    </tr>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <div className="skeleton-pulse" style={{ width: '25%', height: '18px' }} />
        <div className="skeleton-pulse" style={{ width: '20%', height: '18px' }} />
      </div>
      <div className="skeleton-pulse" style={{ width: '85%', height: '16px', margin: '8px 0' }} />
      <div className="skeleton-card-footer">
        <div className="skeleton-pulse" style={{ width: '30%', height: '14px' }} />
        <div className="skeleton-pulse" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
      </div>
    </div>
  );
};

export default SkeletonRow;
