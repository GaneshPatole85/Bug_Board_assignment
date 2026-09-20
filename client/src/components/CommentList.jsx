import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import CommentForm from './CommentForm.jsx';
import './CommentList.css';

/**
 * Format relative time or clean date
 */
function formatCommentTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Generate avatar initials
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const CommentList = ({ issueId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const fetchComments = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/issues/${issueId}/comments?limit=100`);
      setComments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (content) => {
    setIsPosting(true);
    try {
      const res = await apiClient.post(`/issues/${issueId}/comments`, { content });
      if (res.data) {
        setComments((prev) => [...prev, res.data]);
        addToast('Comment posted successfully', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to post comment', 'error');
      throw err;
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="comment-thread-section" id="comments-section">
      <div className="comment-thread-header">
        <h4 className="comment-thread-title">
          Comments <span className="comment-count-pill">{comments.length}</span>
        </h4>
      </div>

      {loading ? (
        <div className="comment-loading-state" id="comments-loading">
          <div className="comment-skeleton-line" />
          <div className="comment-skeleton-line short" />
        </div>
      ) : error ? (
        <div className="comment-error-banner" role="alert">
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="comment-empty-state" id="no-comments-placeholder">
          <div className="comment-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v7.018z" />
            </svg>
          </div>
          <p className="comment-empty-text">No comments yet. Start the conversation below.</p>
        </div>
      ) : (
        <div className="comment-list" id="comment-items-list">
          {comments.map((c) => {
            const author = c.author || {};
            const initials = getInitials(author.name);
            const timeAgo = formatCommentTime(c.createdAt);

            return (
              <div key={c._id} className="comment-card" id={`comment-${c._id}`}>
                <div className="comment-avatar" title={author.name || 'User'}>
                  {initials}
                </div>
                <div className="comment-body-wrap">
                  <div className="comment-meta-bar">
                    <span className="comment-author-name">{author.name || 'Anonymous'}</span>
                    {author.role && (
                      <span className={`comment-role-tag role-${author.role.toLowerCase()}`}>
                        {author.role}
                      </span>
                    )}
                    <span className="comment-timestamp" title={new Date(c.createdAt).toLocaleString()}>
                      {timeAgo}
                    </span>
                  </div>
                  <div className="comment-text-content">
                    {c.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Comment Submission Form */}
      <CommentForm onSubmit={handlePostComment} isLoading={isPosting} />
    </div>
  );
};

export default CommentList;
