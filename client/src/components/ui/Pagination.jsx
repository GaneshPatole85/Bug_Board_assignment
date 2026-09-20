import React from 'react';
import { Button } from './Button.jsx';
import './Pagination.css';

export const Pagination = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  id = 'pagination',
}) => {
  if (!total || totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="pagination-bar" id={id}>
      <div className="pagination-info">
        Showing <span className="font-mono">{startItem}–{endItem}</span> of{' '}
        <span className="font-mono">{total}</span> items
      </div>

      <div className="pagination-actions">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          id={`${id}-prev`}
          aria-label="Previous page"
        >
          Previous
        </Button>

        <span className="pagination-current font-mono">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          id={`${id}-next`}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
