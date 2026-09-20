import React from 'react';
import './CommentList.css';

export const CommentList = () => {
  return (
    <div className="comment-list-container" id="comments-section">
      <div className="comment-placeholder-box">
        <div className="comment-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v7.018z" />
          </svg>
        </div>
        <h4 className="comment-placeholder-title">Discussion & Comments</h4>
        <p className="comment-placeholder-desc">
          Collaborative issue discussions and threaded comments will appear here as team members comment on this issue.
        </p>
      </div>
    </div>
  );
};

export default CommentList;
